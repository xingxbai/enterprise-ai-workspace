import "server-only";

import {
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import { getTicketSummaryById } from "@/data/tickets";
import {
  getChatModel,
  ModelConfigurationError,
  recordModelError,
} from "@/features/ai/server/chatProvider";
import { recordModelCompletion } from "@/features/ai/server/modelAuditLog";
import {
  createApiErrorResponse,
  createApiResponseHeaders,
  recordApiError,
} from "@/features/http/server/apiResponse";

type ReplySuggestionChatInput = {
  actorUserId: string;
  messages: unknown;
  requestId: string;
  signal: AbortSignal;
  ticketId: string;
};

function createReplySuggestionPrompt(input: {
  customerName: string;
  priority: string;
  status: string;
  subject: string;
  ticketId: string;
  updatedAt: string;
}) {
  return [
    "请基于下面的工单摘要生成一段客服回复建议，使用 Markdown 输出。",
    "",
    "输出格式：",
    "### 问题摘要",
    "- 用 1 条要点概括客户问题",
    "### 建议回复",
    "- 给出一段可直接发送给客户的回复",
    "### 后续动作",
    "- 列出 1 到 2 个客服需要继续确认的动作",
    "",
    `工单编号：${input.ticketId}`,
    `客户：${input.customerName}`,
    `主题：${input.subject}`,
    `状态：${input.status}`,
    `优先级：${input.priority}`,
    `更新时间：${input.updatedAt}`,
  ].join("\n");
}

export async function createReplySuggestionChatResponse({
  actorUserId,
  messages,
  requestId,
  signal,
  ticketId,
}: ReplySuggestionChatInput) {
  const validatedMessages = await safeValidateUIMessages<UIMessage>({
    messages,
  });
  if (!validatedMessages.success) {
    return createApiErrorResponse({
      code: "VALIDATION_ERROR",
      message: "消息格式不正确",
      requestId,
      status: 400,
    });
  }

  const ticket = await getTicketSummaryById(ticketId);

  if (!ticket) {
    return createApiErrorResponse({
      code: "NOT_FOUND",
      message: "工单不存在",
      requestId,
      status: 404,
    });
  }

  let modelConfiguration;

  try {
    modelConfiguration = getChatModel();
  } catch (error) {
    if (error instanceof ModelConfigurationError) {
      recordApiError({
        code: "MODEL_CONFIGURATION_ERROR",
        error,
        requestId,
      });
      return createApiErrorResponse({
        code: "MODEL_CONFIGURATION_ERROR",
        message: error.message,
        requestId,
        status: 503,
      });
    }

    recordApiError({
      code: "MODEL_SERVICE_UNAVAILABLE",
      error,
      requestId,
    });
    recordModelError("unknown", error);
    return createApiErrorResponse({
      code: "MODEL_SERVICE_UNAVAILABLE",
      message: "模型服务暂时不可用",
      requestId,
      status: 500,
    });
  }

  const { configuration, model } = modelConfiguration;
  const result = streamText({
    abortSignal: signal,
    maxOutputTokens: configuration.maxOutputTokens,
    maxRetries: 2,
    model,
    onError: ({ error }) => {
      recordModelError(configuration.providerId, error);
    },
    onFinish: ({ finishReason, totalUsage }) => {
      void recordModelCompletion({
        actorUserId,
        finishReason,
        modelId: configuration.modelId,
        providerId: configuration.providerId,
        requestId,
        usage: totalUsage,
      });
    },
    prompt: createReplySuggestionPrompt({
      customerName: ticket.customerName,
      priority: ticket.priority,
      status: ticket.status,
      subject: ticket.subject,
      ticketId: ticket.id,
      updatedAt: ticket.updatedAt,
    }),
    system:
      "你是企业客服助手，只能基于已给出的工单信息生成客服回复建议。信息不足时要明确说明需要补充上下文，不得编造客户问题、订单信息或处理结果。回复必须使用简洁 Markdown，不要输出 HTML。",
    temperature: configuration.temperature,
    timeout: {
      totalMs: configuration.requestTimeoutMs,
    },
  });

  const stream = toUIMessageStream({
    stream: result.stream,
    // 企业重点：前端只拿到本次请求追踪 ID；Provider、模型名和 Prompt 留在服务端日志与审计链路。
    messageMetadata: ({ part }) =>
      part.type === "start" || part.type === "finish"
        ? { requestId }
        : undefined,
    onError: () => "模型服务暂时不可用，请稍后重试",
    originalMessages: validatedMessages.data,
    sendReasoning: false,
    sendSources: false,
  });

  // 企业重点：AI SDK UI Message Stream 会返回 text/event-stream，方便 useChat 统一处理状态、停止和重新生成。
  return createUIMessageStreamResponse({
    headers: createApiResponseHeaders(requestId),
    stream,
  });
}
