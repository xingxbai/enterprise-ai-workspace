import { NoOutputGeneratedError } from "ai";
import { z } from "zod";

import {
  createModelErrorMessage,
  ModelConfigurationError,
  recordModelError,
} from "@/features/ai/server/chatProvider";
import { authenticateApiRequest } from "@/features/auth/server/session";
import {
  predictTicket,
  TicketPredictionNotFoundError,
  TicketPredictionOutputError,
} from "@/features/customer-service/server/ticketPredictionService";
import {
  createApiErrorResponse,
  createApiResponseHeaders,
  createRequestId,
  recordApiError,
} from "@/features/http/server/apiResponse";
import { createBadRequestResponseFromZodError } from "@/features/http/server/requestValidation";

const ticketPredictionPayloadSchema = z
  .object({
    ticketId: z.string().trim().min(1, "ticketId 不能为空"),
  })
  .strict();

export async function POST(request: Request) {
  const requestId = createRequestId();
  const authentication = await authenticateApiRequest(requestId);

  if (!authentication.ok) {
    return authentication.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    recordApiError({ code: "INVALID_JSON", error, requestId });
    return createApiErrorResponse({
      code: "INVALID_JSON",
      message: "请求体必须是 JSON",
      requestId,
      status: 400,
    });
  }

  const payload = ticketPredictionPayloadSchema.safeParse(body);

  if (!payload.success) {
    return createBadRequestResponseFromZodError(
      payload.error,
      { ticketId: "ticketId" },
      requestId,
    );
  }

  try {
    const prediction = await predictTicket({
      actorUserId: authentication.user.id,
      requestId,
      signal: request.signal,
      ticketId: payload.data.ticketId,
    });

    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        prediction,
        requestId,
      },
      { headers: createApiResponseHeaders(requestId) },
    );
  } catch (error) {
    if (error instanceof TicketPredictionNotFoundError) {
      return createApiErrorResponse({
        code: "NOT_FOUND",
        message: error.message,
        requestId,
        status: 404,
      });
    }

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

    if (
      error instanceof TicketPredictionOutputError ||
      NoOutputGeneratedError.isInstance(error)
    ) {
      recordApiError({ code: "MODEL_OUTPUT_INVALID", error, requestId });
      return createApiErrorResponse({
        code: "MODEL_OUTPUT_INVALID",
        message: "模型未返回符合要求的结构化结果，请重试",
        requestId,
        status: 502,
      });
    }

    if (request.signal.aborted) {
      return createApiErrorResponse({
        code: "REQUEST_ABORTED",
        message: "预测请求已取消",
        requestId,
        status: 499,
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
      message: createModelErrorMessage(error),
      requestId,
      status: 502,
    });
  }
}
