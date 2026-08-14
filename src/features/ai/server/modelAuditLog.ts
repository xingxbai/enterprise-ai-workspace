import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type ChatProviderId,
  recordModelError,
} from "@/features/ai/server/chatProvider";

type ModelCompletionLog = {
  actorUserId: string;
  createdAt: string;
  finishReason?: string;
  modelId: string;
  providerId: ChatProviderId;
  requestId: string;
  usage?: unknown;
};

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

export async function recordModelCompletion(input: {
  actorUserId: string;
  finishReason?: string;
  modelId: string;
  providerId: ChatProviderId;
  requestId: string;
  usage?: unknown;
}) {
  const entry: ModelCompletionLog = {
    actorUserId: input.actorUserId,
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
