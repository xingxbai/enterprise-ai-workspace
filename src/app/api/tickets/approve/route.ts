import { z } from "zod";

import { createTicketsApiUrl, getBusinessApiHeaders } from "@/data/tickets";
import {
  createApiErrorResponse,
  createApiResponseHeaders,
  createRequestId,
  recordApiError,
} from "@/features/http/server/apiResponse";
import { createBadRequestResponseFromZodError } from "@/features/http/server/requestValidation";

const approveTicketPayloadSchema = z
  .object({
    ticketId: z.string().trim().min(1, "ticketId 不能为空"),
  })
  .strict();

const APPROVE_REQUEST_TIMEOUT_MS = 10_000;

export async function POST(request: Request) {
  const requestId = createRequestId();
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

  const payload = approveTicketPayloadSchema.safeParse(body);

  if (!payload.success) {
    return createBadRequestResponseFromZodError(
      payload.error,
      { ticketId: "ticketId" },
      requestId,
    );
  }

  const approveUrl = createTicketsApiUrl(
    `tickets/${encodeURIComponent(payload.data.ticketId)}/approve`,
  );

  if (!approveUrl) {
    return createApiErrorResponse({
      code: "BUSINESS_API_CONFIGURATION_ERROR",
      message: "未配置真实工单审批接口",
      requestId,
      status: 503,
    });
  }

  const headers = getBusinessApiHeaders();
  headers.set("Content-Type", "application/json");

  let response: Response;

  try {
    response = await fetch(approveUrl, {
      body: JSON.stringify({ ticketId: payload.data.ticketId }),
      headers,
      method: "POST",
      // 企业重点：浏览器取消和BFF超时都会停止上游写入请求，避免悬挂连接。
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(APPROVE_REQUEST_TIMEOUT_MS),
      ]),
    });
  } catch (error) {
    const isTimeoutOrCancellation =
      request.signal.aborted ||
      (error instanceof DOMException &&
        (error.name === "AbortError" || error.name === "TimeoutError"));
    const code = isTimeoutOrCancellation
      ? "UPSTREAM_TIMEOUT"
      : "UPSTREAM_SERVICE_ERROR";

    recordApiError({ code, error, requestId });
    return createApiErrorResponse({
      code,
      message: isTimeoutOrCancellation
        ? "工单审批请求超时，请稍后重试"
        : "工单服务暂时不可用，请稍后重试",
      requestId,
      status: isTimeoutOrCancellation ? 504 : 502,
    });
  }

  if (!response.ok) {
    const isAuthenticationError =
      response.status === 401 || response.status === 403;
    const code = isAuthenticationError
      ? "UPSTREAM_AUTHENTICATION_ERROR"
      : "UPSTREAM_SERVICE_ERROR";

    recordApiError({ code, requestId });
    return createApiErrorResponse({
      code,
      message: isAuthenticationError
        ? "工单服务认证失败，请联系管理员"
        : "工单审批失败，请稍后重试",
      requestId,
      status: 502,
    });
  }

  return Response.json(
    {
      message: "工单审批已提交",
      requestId,
      ticketId: payload.data.ticketId,
    },
    { headers: createApiResponseHeaders(requestId) },
  );
}
