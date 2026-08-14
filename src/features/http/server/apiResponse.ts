import "server-only";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "INVALID_JSON"
  | "MODEL_CONFIGURATION_ERROR"
  | "MODEL_SERVICE_UNAVAILABLE"
  | "NOT_FOUND"
  | "UPSTREAM_SERVICE_ERROR"
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
  const safeMessage =
    input.error instanceof Error
      ? input.error.message
          .replace(/sk-[a-zA-Z0-9_-]+/g, "[密钥已隐藏]")
          .slice(0, 500)
      : undefined;
  
  // 企业重点：BFF 日志只记录错误类型和 requestId，不记录请求体、Prompt、Authorization 或 API Key。
  console.error("BFF 请求失败", {
    code: input.code,
    message: safeMessage,
    name: input.error instanceof Error ? input.error.name : typeof input.error,
    requestId: input.requestId,
  });
}
