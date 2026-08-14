import "server-only";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "BUSINESS_API_CONFIGURATION_ERROR"
  | "INVALID_JSON"
  | "MODEL_CONFIGURATION_ERROR"
  | "MODEL_SERVICE_UNAVAILABLE"
  | "NOT_FOUND"
  | "UPSTREAM_AUTHENTICATION_ERROR"
  | "UPSTREAM_SERVICE_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "VALIDATION_ERROR";

type ApiErrorResponseInput = {
  code: ApiErrorCode;
  message: string;
  requestId: string;
  status: number;
};

export function createRequestId() {
  return crypto.randomUUID();
}

export function createApiResponseHeaders(requestId: string) {
  return {
    // 企业重点：响应头携带 requestId，方便前端报错截图和服务端审计日志关联。
    "x-request-id": requestId,
  };
}

export function createApiErrorResponse({
  code,
  message,
  requestId,
  status,
}: ApiErrorResponseInput) {
  return Response.json(
    {
      code,
      message,
      requestId,
    },
    {
      headers: createApiResponseHeaders(requestId),
      status,
    },
  );
}

export function recordApiError(input: {
  code: ApiErrorCode;
  error?: unknown;
  requestId: string;
}) {
  // 企业重点：采用白名单日志字段，不尝试用正则清洗不可控的上游错误正文。
  console.error("BFF 请求失败", {
    code: input.code,
    name: input.error instanceof Error ? input.error.name : typeof input.error,
    requestId: input.requestId,
  });
}
