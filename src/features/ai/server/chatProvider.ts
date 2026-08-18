import "server-only";

import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { z } from "zod";

export const chatProviderIdSchema = z.enum(["deepseek", "kimi"]);

export type ChatProviderId = z.infer<typeof chatProviderIdSchema>;

export type AIConfiguration = {
  baseURL: string;
  label: string;
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
  KIMI_MODEL: z
    .string()
    .trim()
    .min(1)
    .default("kimi-k2.7-code-highspeed"),
});

export class ModelConfigurationError extends Error {
  constructor(message = "模型服务配置不正确") {
    super(message);
    this.name = "ModelConfigurationError";
  }
}

let deepseekProvider: OpenAIProvider | undefined;
let kimiProvider: OpenAIProvider | undefined;

const chatProviderDefinitions = [
  {
    label: "DeepSeek",
    providerId: "deepseek",
    temperature: 0.7,
  },
  {
    label: "Kimi",
    providerId: "kimi",
    // 企业重点：Kimi 的参数偏好封装在 Provider Adapter，业务层和前端不感知厂商差异。
    temperature: 1,
  },
] as const satisfies Array<{
  label: string;
  providerId: ChatProviderId;
  temperature: number;
}>;

function hasServerSecret(value: string | undefined): value is string {
  return Boolean(value && value.trim() && !value.includes("请填写"));
}

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

function createAIConfiguration(
  environment: z.infer<typeof aiEnvironmentSchema>,
  providerId: ChatProviderId,
): AIConfiguration & { apiKey: string | undefined } {
  const providerDefinition = chatProviderDefinitions.find(
    (definition) => definition.providerId === providerId,
  );

  if (!providerDefinition) {
    throw new ModelConfigurationError("不支持的模型服务商");
  }

  if (providerId === "kimi") {
    return {
      apiKey: environment.KIMI_API_KEY,
      baseURL: environment.KIMI_BASE_URL,
      label: providerDefinition.label,
      maxOutputTokens: environment.AI_MAX_OUTPUT_TOKENS,
      modelId: environment.KIMI_MODEL,
      providerId,
      requestTimeoutMs: environment.AI_REQUEST_TIMEOUT_MS,
      temperature: providerDefinition.temperature,
    };
  }

  return {
    apiKey: environment.DEEPSEEK_API_KEY,
    baseURL: environment.DEEPSEEK_BASE_URL,
    label: providerDefinition.label,
    maxOutputTokens: environment.AI_MAX_OUTPUT_TOKENS,
    modelId: environment.DEEPSEEK_MODEL,
    providerId,
    requestTimeoutMs: environment.AI_REQUEST_TIMEOUT_MS,
    temperature: providerDefinition.temperature,
  };
}

export function getChatProvidersStatus() {
  const environment = parseAIEnvironment();

  return {
    activeProviderId: environment.AI_CHAT_PROVIDER,
    providers: chatProviderDefinitions.map((definition) => {
      const configuration = createAIConfiguration(
        environment,
        definition.providerId,
      );

      return {
        baseURLHost: new URL(configuration.baseURL).host,
        isActive: definition.providerId === environment.AI_CHAT_PROVIDER,
        isConfigured: hasServerSecret(configuration.apiKey),
        label: configuration.label,
        maxOutputTokens: configuration.maxOutputTokens,
        modelId: configuration.modelId,
        providerId: configuration.providerId,
        requestTimeoutMs: configuration.requestTimeoutMs,
        temperature: configuration.temperature,
      };
    }),
  };
}

export function getChatProviderStatus() {
  const status = getChatProvidersStatus();
  const activeProvider = status.providers.find(
    (provider) => provider.providerId === status.activeProviderId,
  );

  if (!activeProvider) {
    throw new ModelConfigurationError("不支持的模型服务商");
  }

  return activeProvider;
}

export function getChatModel() {
  const environment = parseAIEnvironment();
  const configurationWithSecret = createAIConfiguration(
    environment,
    environment.AI_CHAT_PROVIDER,
  );
  const { apiKey, ...configuration } = configurationWithSecret;

  if (!hasServerSecret(apiKey)) {
    throw new ModelConfigurationError(
      `未配置 ${configuration.label} 服务端密钥`,
    );
  }

  if (configuration.providerId === "kimi") {
    kimiProvider ??= createOpenAI({
      apiKey,
      baseURL: configuration.baseURL,
      name: "kimi",
    });

    return {
      configuration,
      // 企业重点：DeepSeek/Kimi 是 Chat Completions 兼容接口，必须使用 chat 模型入口。
      model: kimiProvider.chat(configuration.modelId),
    };
  }

  deepseekProvider ??= createOpenAI({
    apiKey,
    baseURL: configuration.baseURL,
    name: "deepseek",
  });

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
  const apiError =
    typeof error === "object" && error !== null
      ? (error as { isRetryable?: unknown; statusCode?: unknown })
      : null;
  // 企业重点：上游错误正文不可控，只记录白名单字段，避免正则脱敏遗漏密钥或客户数据。
  console.error("模型调用失败", {
    isRetryable:
      typeof apiError?.isRetryable === "boolean"
        ? apiError.isRetryable
        : undefined,
    name: error instanceof Error ? error.name : typeof error,
    providerId,
    statusCode:
      typeof apiError?.statusCode === "number" ? apiError.statusCode : undefined,
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
