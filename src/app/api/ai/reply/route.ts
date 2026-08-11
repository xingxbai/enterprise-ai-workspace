import { z } from "zod";

import { createReplySuggestionResponse } from "@/features/customer-service/server/replySuggestionStream";

const replySuggestionPayloadSchema = z
  .object({
    ticketId: z.string().trim().min(1, "ticketId 不能为空"),
  })
  .strict();

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "请求体必须是 JSON" }, { status: 400 });
  }

  const payload = replySuggestionPayloadSchema.safeParse(body);

  if (!payload.success) {
    return Response.json(
      { message: payload.error.issues[0]?.message ?? "请求参数不正确" },
      { status: 400 },
    );
  }

  return createReplySuggestionResponse({
    signal: request.signal,
    ticketId: payload.data.ticketId,
  });
}
