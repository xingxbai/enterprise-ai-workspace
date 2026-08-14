import { z } from "zod";

import { createReplySuggestionResponse } from "@/features/customer-service/server/replySuggestionStream";
import {
  createApiErrorResponse,
  createRequestId,
  recordApiError,
} from "@/features/http/server/apiResponse";
import { createBadRequestResponseFromZodError } from "@/features/http/server/requestValidation";

const replySuggestionPayloadSchema = z
  .object({
    ticketId: z.string().trim().min(1, "ticketId 不能为空"),
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

  const payload = replySuggestionPayloadSchema.safeParse(body);

  if (!payload.success) {
    return createBadRequestResponseFromZodError(payload.error, {
      ticketId: "ticketId",
    }, requestId);
  }

  return createReplySuggestionResponse({
    requestId,
    signal: request.signal,
    ticketId: payload.data.ticketId,
  });
}
