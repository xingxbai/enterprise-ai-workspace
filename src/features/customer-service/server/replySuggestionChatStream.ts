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

type ReplySuggestionChatInput = {
  messages: unknown;
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
    "请基于下面的工单摘要生成一段客服回复建议。",
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
  messages,
  signal,
  ticketId,
}: ReplySuggestionChatInput) {
  const validatedMessages = await safeValidateUIMessages<UIMessage>({
    messages,
  });
  if (!validatedMessages.success) {
    return Response.json({ message: "消息格式不正确" }, { status: 400 });
  }

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
  const requestId = crypto.randomUUID();
  const result = streamText({
    abortSignal: signal,
    maxOutputTokens: configuration.maxOutputTokens,
    maxRetries: 2,
    model,
    onError: ({ error }) => {
      recordModelError(configuration.providerId, error);
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
      "你是企业客服助手，只能基于已给出的工单信息生成客服回复建议。信息不足时要明确说明需要补充上下文，不得编造客户问题、订单信息或处理结果。",
    temperature: configuration.temperature,
    timeout: {
      totalMs: configuration.requestTimeoutMs,
    },
  });

  const stream = toUIMessageStream({
    stream: result.stream,
    // 企业重点：前端只拿到本次请求追踪 ID；Provider、模型名和 Prompt 留在服务端日志与审计链路。
    messageMetadata: ({ part }) =>
      part.type === "start" || part.type === "finish" ? { requestId } : undefined,
    onError: () => "模型服务暂时不可用，请稍后重试",
    originalMessages: validatedMessages.data,
    sendReasoning: false,
    sendSources: false,
  });

  // 企业重点：AI SDK UI Message Stream 会返回 text/event-stream，方便 useChat 统一处理状态、停止和重新生成。
  return createUIMessageStreamResponse({
    stream,
  });
}
