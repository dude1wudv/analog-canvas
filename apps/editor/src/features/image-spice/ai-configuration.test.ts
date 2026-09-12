import { describe, expect, it } from "vitest";

import {
  createAiConfiguration,
  parseModelNames,
  validateAiConfiguration,
  type AiConfiguration,
} from "./ai-configuration";

function configuration(
  overrides: Partial<AiConfiguration> = {},
): AiConfiguration {
  return {
    id: "config-1",
    name: "Vision gateway",
    baseUrl: "https://vision.example.test/v1",
    protocol: "chat-completions",
    reasoningEffort: "low",
    apiKey: "provider-secret",
    models: ["vision-model"],
    ...overrides,
  };
}

describe("AI interface configuration", () => {
  it("creates an empty page-session configuration", () => {
    const value = createAiConfiguration();

    expect(value.id).toEqual(expect.any(String));
    expect(value.name).toBe("新接口");
    expect(value.baseUrl).toBe("");
    expect(value.protocol).toBe("chat-completions");
    expect(value.reasoningEffort).toBe("low");
    expect(value.apiKey).toBe("");
    expect(value.models).toEqual([]);
  });

  it("parses comma and newline separated model IDs, trimming and deduplicating them", () => {
    expect(
      parseModelNames(" vision-a\nvision-b, vision-a，\n\nvision-c "),
    ).toEqual(["vision-a", "vision-b", "vision-c"]);
  });

  it("accepts a complete HTTPS configuration", () => {
    expect(() => validateAiConfiguration(configuration())).not.toThrow();
  });

  it.each([
    ["missing name", { name: "" }],
    ["name over 80 characters", { name: "x".repeat(81) }],
    ["missing key", { apiKey: "" }],
    ["key with a newline", { apiKey: "secret\nleak" }],
    ["key over 4096 characters", { apiKey: "x".repeat(4097) }],
    ["missing models", { models: [] }],
    [
      "more than 30 models",
      { models: Array.from({ length: 31 }, (_, i) => `m${i}`) },
    ],
    ["empty model ID", { models: [""] }],
    ["model ID over 160 characters", { models: ["x".repeat(161)] }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => validateAiConfiguration(configuration(overrides))).toThrow();
  });

  it("uses the shared URL safety rules for configurations", () => {
    for (const baseUrl of [
      "http://vision.example.test/v1",
      "https://user:password@vision.example.test/v1",
      "https://vision.example.test/v1?key=secret",
    ]) {
      expect(() =>
        validateAiConfiguration(configuration({ baseUrl })),
      ).toThrow();
    }
  });
});
