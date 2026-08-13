import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

type ModelCompletionLog = {
  createdAt: string;
  finishReason?: string;
  modelId: string;
  providerId: ChatProviderId;
  requestId: string;
  usage?: unknown;
};

function hasServerSecret(value: string | undefined) {
  return Boolean(value && value.trim() && !value.includes("请填写"));
}

function createShanghaiMonthDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
  }).formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${month}-${day}`;
}

function toJsonSafeValue(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return undefined;
  }
}

async function readCompletionLogs(filePath: string) {
  try {
    const content = await readFile(filePath, "utf8");
    const parsedValue = JSON.parse(content) as unknown;

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

async function appendModelCompletionLog(entry: ModelCompletionLog) {
  const logsDirectory = path.join(process.cwd(), "logs");
  const filePath = path.join(
    logsDirectory,
    `${createShanghaiMonthDay(new Date(entry.createdAt))}.json`,
  );

  await mkdir(logsDirectory, { recursive: true });

  const existingLogs = await readCompletionLogs(filePath);
  existingLogs.push(entry);

  await writeFile(filePath, `${JSON.stringify(existingLogs, null, 2)}\n`);
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

export function getChatProviderStatus() {
  const environment = parseAIEnvironment();
  const providerId = environment.AI_CHAT_PROVIDER;
  const isDeepSeek = providerId === "deepseek";
  const apiKey = isDeepSeek
    ? environment.DEEPSEEK_API_KEY
    : environment.KIMI_API_KEY;
  const baseURL = isDeepSeek
    ? environment.DEEPSEEK_BASE_URL
    : environment.KIMI_BASE_URL;
  const modelId = isDeepSeek
    ? environment.DEEPSEEK_MODEL
    : environment.KIMI_MODEL;

  return {
    baseURLHost: new URL(baseURL).host,
    isConfigured: hasServerSecret(apiKey),
    label: isDeepSeek ? "DeepSeek" : "Kimi",
    maxOutputTokens: environment.AI_MAX_OUTPUT_TOKENS,
    modelId,
    providerId,
    requestTimeoutMs: environment.AI_REQUEST_TIMEOUT_MS,
  };
}

export function getChatModel() {
  const environment = parseAIEnvironment();

  if (environment.AI_CHAT_PROVIDER === "kimi") {
    if (!hasServerSecret(environment.KIMI_API_KEY)) {
      throw new ModelConfigurationError("未配置 Kimi 服务端密钥");
    }

    kimiProvider ??= createOpenAI({
      apiKey: environment.KIMI_API_KEY,
      baseURL: environment.KIMI_BASE_URL,
      name: "kimi",
    });

    const configuration: AIConfiguration = {
      baseURL: environment.KIMI_BASE_URL,
      label: "Kimi",
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

  if (!hasServerSecret(environment.DEEPSEEK_API_KEY)) {
    throw new ModelConfigurationError("未配置 DeepSeek 服务端密钥");
  }

  deepseekProvider ??= createOpenAI({
    apiKey: environment.DEEPSEEK_API_KEY,
    baseURL: environment.DEEPSEEK_BASE_URL,
    name: "deepseek",
  });

  const configuration: AIConfiguration = {
    baseURL: environment.DEEPSEEK_BASE_URL,
    label: "DeepSeek",
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

export async function recordModelCompletion(input: {
  finishReason?: string;
  modelId: string;
  providerId: ChatProviderId;
  requestId: string;
  usage?: unknown;
}) {
  const entry: ModelCompletionLog = {
    createdAt: new Date().toISOString(),
    finishReason: input.finishReason,
    modelId: input.modelId,
    providerId: input.providerId,
    requestId: input.requestId,
    usage: toJsonSafeValue(input.usage),
  };

  try {
    // 企业重点：本地审计日志只记录可观测字段，不记录 Prompt、客户正文、Authorization 或 API Key。
    await appendModelCompletionLog(entry);
  } catch (error) {
    recordModelError(input.providerId, error);
  }
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
