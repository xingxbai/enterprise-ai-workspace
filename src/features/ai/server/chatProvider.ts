import "server-only";

import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { z } from "zod";

export const chatProviderIdSchema = z.enum(["deepseek", "kimi"]);

export type ChatProviderId = z.infer<typeof chatProviderIdSchema>;

export type AIConfiguration = {
  maxOutputTokens: number;
  modelId: string;
  providerId: ChatProviderId;
  requestTimeoutMs: number;
  temperature: number;
};

const aiEnvironmentSchema = z.object({
  AI_CHAT_PROVIDER: chatProviderIdSchema.default("deepseek"),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1).max(8192).default(2048),
  AI_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(300_000)
    .default(60_000),
  DEEPSEEK_API_KEY: z.string().trim().optional(),
  DEEPSEEK_BASE_URL: z.url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().trim().min(1).default("deepseek-chat"),
  KIMI_API_KEY: z.string().trim().optional(),
  KIMI_BASE_URL: z.url().default("https://api.moonshot.cn/v1"),
  KIMI_MODEL: z.string().trim().min(1).default("kimi-k2.5"),
});

export class ModelConfigurationError extends Error {
  constructor(message = "模型服务配置不正确") {
    super(message);
    this.name = "ModelConfigurationError";
  }
}

let deepseekProvider: OpenAIProvider | undefined;
let kimiProvider: OpenAIProvider | undefined;

function parseAIEnvironment() {
  const parsedEnvironment = aiEnvironmentSchema.safeParse(process.env);

  if (!parsedEnvironment.success) {
    // 企业重点：环境配置日志只记录字段和规则，不记录密钥值。
    console.error(
      "AI 环境配置不正确",
      parsedEnvironment.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
    throw new ModelConfigurationError();
  }

  return parsedEnvironment.data;
}

export function getChatModel() {
  const environment = parseAIEnvironment();

  if (environment.AI_CHAT_PROVIDER === "kimi") {
    if (!environment.KIMI_API_KEY) {
      throw new ModelConfigurationError("未配置 Kimi 服务端密钥");
    }

    kimiProvider ??= createOpenAI({
      apiKey: environment.KIMI_API_KEY,
      baseURL: environment.KIMI_BASE_URL,
      name: "kimi",
    });

    const configuration: AIConfiguration = {
      maxOutputTokens: environment.AI_MAX_OUTPUT_TOKENS,
      modelId: environment.KIMI_MODEL,
      providerId: "kimi",
      requestTimeoutMs: environment.AI_REQUEST_TIMEOUT_MS,
      // 企业重点：Kimi 当前配置固定使用 temperature=1，厂商差异封装在 Provider Adapter。
      temperature: 1,
    };

    return {
      configuration,
      // 企业重点：DeepSeek/Kimi 是 Chat Completions 兼容接口，必须使用 chat 模型入口。
      model: kimiProvider.chat(configuration.modelId),
    };
  }

  if (!environment.DEEPSEEK_API_KEY) {
    throw new ModelConfigurationError("未配置 DeepSeek 服务端密钥");
  }

  deepseekProvider ??= createOpenAI({
    apiKey: environment.DEEPSEEK_API_KEY,
    baseURL: environment.DEEPSEEK_BASE_URL,
    name: "deepseek",
  });

  const configuration: AIConfiguration = {
    maxOutputTokens: environment.AI_MAX_OUTPUT_TOKENS,
    modelId: environment.DEEPSEEK_MODEL,
    providerId: "deepseek",
    requestTimeoutMs: environment.AI_REQUEST_TIMEOUT_MS,
    temperature: 0.7,
  };

  return {
    configuration,
    // 企业重点：DeepSeek 使用 Chat Completions 兼容接口，不能走 OpenAI Responses API。
    model: deepseekProvider.chat(configuration.modelId),
  };
}

export function recordModelError(
  providerId: ChatProviderId | "unknown",
  error: unknown,
) {
  const safeMessage =
    error instanceof Error
      ? error.message
          .replace(/sk-[a-zA-Z0-9_-]+/g, "[密钥已隐藏]")
          .slice(0, 500)
      : undefined;

  // 企业重点：日志可以记录厂商和错误类型，但不记录请求正文、Authorization 或 API Key。
  console.error("模型调用失败", {
    message: safeMessage,
    name: error instanceof Error ? error.name : typeof error,
    providerId,
  });
}

export function createModelErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("401") || message.includes("403")) {
    return "模型服务认证失败，请联系管理员";
  }

  if (message.includes("429") || message.includes("rate limit")) {
    return "模型服务请求过于频繁，请稍后重试";
  }

  if (message.includes("timeout") || message.includes("timed out")) {
    return "模型响应超时，请稍后重试";
  }

  return "模型服务暂时不可用，请稍后重试";
}
