import "server-only";

import { streamText } from "ai";

import {
  getChatModel,
  ModelConfigurationError,
  recordModelError,
} from "@/features/ai/server/chatProvider";
import { getTicketSummaryById } from "@/data/tickets";

type ReplySuggestionStreamInput = {
  ticketId: string;
  signal: AbortSignal;
};

export async function createReplySuggestionResponse({
  signal,
  ticketId,
}: ReplySuggestionStreamInput) {
  const ticket = await getTicketSummaryById(ticketId);

  if (!ticket) {
    return Response.json({ message: "工单不存在" }, { status: 404 });
  }

  let modelConfiguration;

  try {
    modelConfiguration = getChatModel();
  } catch (error) {
    if (error instanceof ModelConfigurationError) {
      return Response.json({ message: error.message }, { status: 503 });
    }

    recordModelError("unknown", error);
    return Response.json({ message: "模型服务暂时不可用" }, { status: 500 });
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

  return result.toTextStreamResponse({
    headers: {
      "Cache-Control": "no-store, no-transform",
    },
  });
}
