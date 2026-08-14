import "server-only";

import { streamText } from "ai";

import {
  getChatModel,
  ModelConfigurationError,
  recordModelError,
} from "@/features/ai/server/chatProvider";
import { getTicketSummaryById } from "@/data/tickets";
import { createReplySuggestionStreamResponse } from "@/features/customer-service/replySuggestionProtocol";
import {
  createApiErrorResponse,
  recordApiError,
} from "@/features/http/server/apiResponse";

type ReplySuggestionStreamInput = {
  requestId: string;
  signal: AbortSignal;
  ticketId: string;
};

export async function createReplySuggestionResponse({
  requestId,
  signal,
  ticketId,
}: ReplySuggestionStreamInput) {
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
    prompt: [
      "请基于下面的工单摘要生成一段客服回复建议。",
      "",
      `工单编号：${ticket.id}`,
      `客户：${ticket.customerName}`,
      `主题：${ticket.subject}`,
      `状态：${ticket.status}`,
      `优先级：${ticket.priority}`,
      `更新时间：${ticket.updatedAt}`,
    ].join("\n"),
    system:
      "你是企业客服助手，只能基于已给出的工单信息生成客服回复建议。信息不足时要明确说明需要补充上下文，不得编造客户问题、订单信息或处理结果。",
    temperature: configuration.temperature,
    timeout: {
      totalMs: configuration.requestTimeoutMs,
    },
  });
  return createReplySuggestionStreamResponse({
    createdAt: new Date().toISOString(),
    modelId: configuration.modelId,
    providerId: configuration.providerId,
    requestId,
    stream: result.stream,
    ticketId: ticket.id,
  });
}
