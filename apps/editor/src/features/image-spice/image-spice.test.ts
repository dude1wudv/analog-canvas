import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

import {
  MAX_IMAGE_BYTES,
  aiCompletionUrl,
  parseRecognitionResponse,
  recognizeCircuitImage,
  testAiConnection,
  validateImageFile,
  validateStructuralSpice,
} from "./image-spice";

const loadModule = createRequire(import.meta.url);
const { PNG } = loadModule("pngjs") as {
  PNG: {
    sync: {
      read(input: Buffer): {
        readonly width: number;
        readonly height: number;
        readonly data: Uint8Array;
      };
    };
  };
};

const validSpice =
  "* resistor divider\nV1 in 0 1\nR1 in out 1k\nC1 out 0 1u\n.end\n";
const trimmedValidSpice = validSpice.trim();

function recognitionPayload(spice = validSpice, uncertainties: string[] = []) {
  return JSON.stringify({ spice, uncertainties });
}

function recognitionResponse(content: string, finishReason = "stop"): Response {
  return new Response(
    JSON.stringify({
      choices: [{ finish_reason: finishReason, message: { content } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("image-to-SPICE validation and response contracts", () => {
  it("accepts supported image MIME types up to the configured limit", () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
    expect(() =>
      validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES }),
    ).not.toThrow();
    expect(() =>
      validateImageFile({ type: "image/jpeg", size: 1 }),
    ).not.toThrow();
  });

  it("rejects non-image files and images over the upload limit", () => {
    expect(() =>
      validateImageFile({ type: "application/pdf", size: 1 }),
    ).toThrow();
    expect(() =>
      validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }),
    ).toThrow();
  });

  it("normalizes either OpenAI-compatible endpoint without duplicating it", () => {
    expect(
      aiCompletionUrl("https://vision.example.test", "chat-completions"),
    ).toBe("https://vision.example.test/v1/chat/completions");
    expect(
      aiCompletionUrl("https://vision.example.test/", "chat-completions"),
    ).toBe("https://vision.example.test/v1/chat/completions");
    expect(aiCompletionUrl("https://vision.example.test/v1", "responses")).toBe(
      "https://vision.example.test/v1/responses",
    );
    expect(
      aiCompletionUrl(
        "https://vision.example.test/v1/chat/completions/",
        "responses",
      ),
    ).toBe("https://vision.example.test/v1/responses");
    expect(
      aiCompletionUrl("https://gateway.example.test/openai/v1", "responses"),
    ).toBe("https://gateway.example.test/openai/v1/responses");
  });

  it("requires HTTPS and rejects URLs that could hide or alter credentials", () => {
    for (const url of [
      "http://vision.example.test",
      "https://user:password@vision.example.test",
      "https://vision.example.test?key=secret",
      "https://vision.example.test/v1#chat-completions",
    ]) {
      expect(() => aiCompletionUrl(url, "chat-completions"), url).toThrow();
    }
  });

  it("parses either strict JSON or a complete fenced JSON response", () => {
    expect(parseRecognitionResponse(recognitionPayload())).toEqual({
      spice: trimmedValidSpice,
      uncertainties: [],
    });
    expect(
      parseRecognitionResponse(
        `\`\`\`json\n${recognitionPayload(validSpice, ["R2 value is unclear"])}\n\`\`\``,
      ),
    ).toEqual({
      spice: trimmedValidSpice,
      uncertainties: ["R2 value is unclear"],
    });
  });

  it("rejects prose around JSON and malformed recognition fields", () => {
    for (const content of [
      `Here is the circuit:\n${recognitionPayload()}`,
      `${recognitionPayload()}\nHope this helps.`,
      "```json\n" + recognitionPayload() + "\n```\ntrailing text",
      JSON.stringify({ spice: "", uncertainties: [] }),
      JSON.stringify({ spice: "   ", uncertainties: [] }),
      JSON.stringify({ spice: validSpice, uncertainties: "unclear" }),
      JSON.stringify({ spice: validSpice, uncertainties: ["ok", 2] }),
      JSON.stringify({ spice: validSpice }),
    ]) {
      expect(() => parseRecognitionResponse(content), content).toThrow();
    }
  });

  it("enforces bounded response sizes", () => {
    expect(() =>
      parseRecognitionResponse(recognitionPayload("x".repeat(100_001), [])),
    ).toThrow();
    expect(() =>
      parseRecognitionResponse(
        recognitionPayload("R1 a b 1k", ["x".repeat(1_001)]),
      ),
    ).toThrow();
    expect(() =>
      parseRecognitionResponse(
        recognitionPayload(
          "R1 a b 1k",
          Array.from({ length: 101 }, () => "x"),
        ),
      ),
    ).toThrow();
  });

  it("posts the image to the normalized endpoint with a redacted-safe request policy", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        recognitionResponse(recognitionPayload()),
    );
    const controller = new AbortController();

    const result = await recognizeCircuitImage(
      {
        baseUrl: "https://vision.example.test/v1/",
        protocol: "chat-completions",
        reasoningEffort: "low",
        apiKey: "provider-secret",
        model: "vision-model",
        imageDataUrl: "data:image/png;base64,ZmFrZQ==",
        signal: controller.signal,
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(result).toEqual({ spice: trimmedValidSpice, uncertainties: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [input, init] = fetchMock.mock.calls[0]!;
    expect(input).toBe("https://vision.example.test/v1/chat/completions");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("omit");
    expect(init?.redirect).toBe("error");
    expect(init?.signal).toBe(controller.signal);
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer provider-secret",
    );
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/json",
    );

    const body = JSON.parse(String(init?.body)) as {
      model: string;
      reasoning_effort: string;
      messages: Array<{
        role: string;
        content: Array<{
          type: string;
          image_url?: { url: string };
        }>;
      }>;
    };
    expect(body.model).toBe("vision-model");
    expect(body.reasoning_effort).toBe("low");
    const userMessage = body.messages.find(
      (message) => message.role === "user",
    );
    expect(userMessage).toBeDefined();
    expect(userMessage?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "image_url",
          image_url: expect.objectContaining({
            url: "data:image/png;base64,ZmFrZQ==",
          }),
        }),
      ]),
    );
  });

  it("uses the Responses image contract and parses completed output text", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({
          status: "completed",
          output: [
            {
              type: "message",
              status: "completed",
              content: [{ type: "output_text", text: recognitionPayload() }],
            },
          ],
        }),
    );

    const result = await recognizeCircuitImage(
      {
        baseUrl: "https://vision.example.test/v1/chat/completions",
        protocol: "responses",
        reasoningEffort: "high",
        apiKey: "provider-secret",
        model: "vision-model",
        imageDataUrl: "data:image/png;base64,ZmFrZQ==",
        signal: new AbortController().signal,
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(result).toEqual({ spice: trimmedValidSpice, uncertainties: [] });
    const [input, init] = fetchMock.mock.calls[0]!;
    expect(input).toBe("https://vision.example.test/v1/responses");
    const body = JSON.parse(String(init?.body)) as {
      reasoning: { effort: string };
      instructions: string;
      input: Array<{
        role: string;
        content: Array<{
          type: string;
          image_url?: string;
          detail?: string;
        }>;
      }>;
    };
    expect(body.reasoning.effort).toBe("high");
    expect(body.instructions).toContain("structural SPICE");
    expect(body.input[0]?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "input_image",
          image_url: "data:image/png;base64,ZmFrZQ==",
          detail: "high",
        }),
      ]),
    );
  });

  it("does not expose an upstream error body or API key", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("provider-secret upstream diagnostic", {
          status: 502,
          headers: { "content-type": "text/plain" },
        }),
    );

    const error = await recognizeCircuitImage(
      {
        baseUrl: "https://vision.example.test",
        protocol: "chat-completions",
        reasoningEffort: "low",
        apiKey: "provider-secret",
        model: "vision-model",
        imageDataUrl: "data:image/png;base64,ZmFrZQ==",
        signal: new AbortController().signal,
      },
      fetchMock as unknown as typeof fetch,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toContain("provider-secret");
    expect(String(error)).not.toContain("upstream diagnostic");
  });
  it("explains custom API authentication failures without blaming account login", async () => {
    const fetchMock = vi.fn(
      async () => new Response("unauthorized", { status: 401 }),
    );

    await expect(
      recognizeCircuitImage(
        {
          baseUrl: "https://vision.example.test",
          protocol: "chat-completions",
          reasoningEffort: "low",
          apiKey: "provider-secret",
          model: "vision-model",
          imageDataUrl: "data:image/png;base64,ZmFrZQ==",
          signal: new AbortController().signal,
        },
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toThrow("不会影响当前登录账号");
  });

  it("rejects a non-stop completion instead of importing partial model output", async () => {
    const fetchMock = vi.fn(async () =>
      recognitionResponse(recognitionPayload(), "length"),
    );

    await expect(
      recognizeCircuitImage(
        {
          baseUrl: "https://vision.example.test",
          protocol: "chat-completions",
          reasoningEffort: "low",
          apiKey: "provider-secret",
          model: "vision-model",
          imageDataUrl: "data:image/png;base64,ZmFrZQ==",
          signal: new AbortController().signal,
        },
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toThrow();
  });
  it("accepts structured text parts in chat completion responses", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: [
                    {
                      type: "text",
                      text: '{"spice":"* test\\n.end","uncertainties":[]}',
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    await expect(
      recognizeCircuitImage(
        {
          baseUrl: "https://vision.example.test",
          protocol: "chat-completions",
          reasoningEffort: "low",
          apiKey: "provider-secret",
          model: "vision-model",
          imageDataUrl: "data:image/png;base64,ZmFrZQ==",
          signal: new AbortController().signal,
        },
        fetchMock as unknown as typeof fetch,
      ),
    ).resolves.toEqual({ spice: "* test\n.end", uncertainties: [] });
  });

  it("passes AbortSignal cancellation through to the fetch request", async () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          requestSignal = init?.signal ?? undefined;
          init?.signal?.addEventListener(
            "abort",
            () =>
              reject(
                init.signal?.reason ??
                  new DOMException("Aborted", "AbortError"),
              ),
            { once: true },
          );
        }),
    );

    const pending = recognizeCircuitImage(
      {
        baseUrl: "https://vision.example.test",
        protocol: "chat-completions",
        reasoningEffort: "low",
        apiKey: "provider-secret",
        model: "vision-model",
        imageDataUrl: "data:image/png;base64,ZmFrZQ==",
        signal: controller.signal,
      },
      fetchMock as unknown as typeof fetch,
    );
    controller.abort();

    await expect(pending).rejects.toThrow("取消");
    expect(requestSignal).toBe(controller.signal);
  });

  it("reports a timed-out request separately from user cancellation", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const pending = recognizeCircuitImage(
      {
        baseUrl: "https://vision.example.test",
        protocol: "responses",
        reasoningEffort: "low",
        apiKey: "provider-secret",
        model: "vision-model",
        imageDataUrl: "data:image/png;base64,ZmFrZQ==",
        signal: controller.signal,
      },
      fetchMock as unknown as typeof fetch,
    );

    controller.abort("timeout");

    await expect(pending).rejects.toThrow("超时");
  });

  it("tests a selected model with a tiny image without parsing the response as SPICE", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        recognitionResponse("OK"),
    );
    const controller = new AbortController();

    const result = await testAiConnection(
      {
        baseUrl: "https://vision.example.test/v1",
        protocol: "chat-completions",
        reasoningEffort: "low",
        apiKey: " provider-secret ",
        model: " vision-model ",
        signal: controller.signal,
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    const [input, init] = fetchMock.mock.calls[0]!;
    expect(input).toBe("https://vision.example.test/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer provider-secret",
    );
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      reasoning_effort: string;
      messages: Array<{
        role: string;
        content: unknown;
      }>;
    };
    expect(body.model).toBe("vision-model");
    expect(body.reasoning_effort).toBe("low");
    const userMessage = body.messages.find(
      (message) => message.role === "user",
    );
    expect(userMessage?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "text",
          text: "Connection test: reply OK.",
        }),
        expect.objectContaining({
          type: "image_url",
          image_url: expect.objectContaining({
            detail: "high",
            url: expect.stringMatching(/^data:image\/png;base64,/u),
          }),
        }),
      ]),
    );
    const imageUrl = (
      userMessage?.content as Array<{ image_url?: { url?: string } }>
    ).find((part) => part.image_url)?.image_url?.url;
    expect(imageUrl).toMatch(/^data:image\/png;base64,/u);
    const encodedPng = imageUrl?.slice("data:image/png;base64,".length);
    expect(encodedPng).toBeDefined();
    const decodedPng = PNG.sync.read(Buffer.from(encodedPng!, "base64"));
    expect(decodedPng.width).toBe(1);
    expect(decodedPng.height).toBe(1);
    expect(decodedPng.data.length).toBe(4);
  });
});

describe("structural SPICE validation", () => {
  it("accepts a compatible netlist and preserves each instance's source pin order", async () => {
    const result = await validateStructuralSpice(validSpice);

    expect(result.canImport).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.instanceCount).toBe(3);
    const connectionFor = (reference: string) =>
      result.connections.find((connection) =>
        connection.reference.endsWith(`/ ${reference}`),
      );
    expect(connectionFor("V1")).toMatchObject({
      pins: expect.arrayContaining(["+ → in", "- → 0"]),
    });
    expect(connectionFor("R1")).toMatchObject({
      pins: expect.arrayContaining(["1 → in", "2 → out"]),
    });
    expect(connectionFor("C1")).toMatchObject({
      pins: expect.arrayContaining(["1 → out", "2 → 0"]),
    });
  });

  it.each([
    ["simulation", ".tran 1n 10n"],
    ["include", ".include models.lib"],
    ["control", ".control\nrun\n.endc"],
  ])(
    "rejects %s directives from an image recognition result",
    async (_kind, directive) => {
      const result = await validateStructuralSpice(
        `V1 in 0 1\nR1 in 0 1k\n${directive}\n.end\n`,
      );

      expect(result.canImport).toBe(false);
      expect(result.diagnostics.length).toBeGreaterThan(0);
    },
  );
});
