import { z } from "zod";

import { createReplySuggestionChatResponse } from "@/features/customer-service/server/replySuggestionChatStream";
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
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "请求体必须是 JSON" }, { status: 400 });
  }

  const payload = replySuggestionChatPayloadSchema.safeParse(body);

  if (!payload.success) {
    return createBadRequestResponseFromZodError(payload.error, {
      messageId: "messageId",
      messages: "messages",
      ticketId: "ticketId",
      trigger: "trigger",
    });
  }

  return createReplySuggestionChatResponse({
    messages: payload.data.messages,
    signal: request.signal,
    ticketId: payload.data.ticketId,
  });
}
