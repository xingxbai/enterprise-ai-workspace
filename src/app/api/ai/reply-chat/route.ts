import { z } from "zod";

import { createReplySuggestionChatResponse } from "@/features/customer-service/server/replySuggestionChatStream";
import {
  createApiErrorResponse,
  createRequestId,
  recordApiError,
} from "@/features/http/server/apiResponse";
import { createBadRequestResponseFromZodError } from "@/features/http/server/requestValidation";

const replySuggestionChatPayloadSchema = z
  .object({
    messageId: z.string().optional(),
    messages: z.unknown(),
    ticketId: z.string().trim().min(1, "ticketId 不能为空"),
    trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const requestId = createRequestId();
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    recordApiError({
      code: "INVALID_JSON",
      error,
      requestId,
    });
    return createApiErrorResponse({
      code: "INVALID_JSON",
      message: "请求体必须是 JSON",
      requestId,
      status: 400,
    });
  }

  const payload = replySuggestionChatPayloadSchema.safeParse(body);

  if (!payload.success) {
    return createBadRequestResponseFromZodError(payload.error, {
      messageId: "messageId",
      messages: "messages",
      ticketId: "ticketId",
      trigger: "trigger",
    }, requestId);
  }

  return createReplySuggestionChatResponse({
    messages: payload.data.messages,
    requestId,
    signal: request.signal,
    ticketId: payload.data.ticketId,
  });
}
