import { aiCompletionUrl } from "./image-spice";

/** Page-session credentials; never persisted with a project or browser storage. */
export type AiApiProtocol = "chat-completions" | "responses";
export type AiReasoningEffort = "low" | "medium" | "high" | "max";

export interface AiConfiguration {
  id: string;
  name: string;
  baseUrl: string;
  protocol: AiApiProtocol;
  reasoningEffort: AiReasoningEffort;
  apiKey: string;
  models: string[];
}

export function createAiConfiguration(): AiConfiguration {
  return {
    id: crypto.randomUUID(),
    name: "新接口",
    baseUrl: "",
    protocol: "chat-completions",
    reasoningEffort: "low",
    apiKey: "",
    models: [],
  };
}

export function parseModelNames(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\n,，]/u)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

export function validateAiConfiguration(value: AiConfiguration): void {
  aiCompletionUrl(value.baseUrl, value.protocol);
  if (!value.name.trim() || value.name.length > 80)
    throw new Error("请填写 1–80 字符的接口名称。");
  if (value.protocol !== "chat-completions" && value.protocol !== "responses")
    throw new Error("请选择有效的 API 协议。");
  if (
    !(["low", "medium", "high", "max"] as const).includes(value.reasoningEffort)
  )
    throw new Error("请选择有效的思考强度。");
  if (
    !value.apiKey.trim() ||
    value.apiKey.length > 4096 ||
    /[\r\n]/u.test(value.apiKey)
  )
    throw new Error("请填写有效的 API Key。");
  if (
    !value.models.length ||
    value.models.length > 30 ||
    value.models.some((model) => !model.trim() || model.length > 160)
  ) {
    throw new Error("请填写 1–30 个模型 ID，每个不超过 160 字符。");
  }
}
