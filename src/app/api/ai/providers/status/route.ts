import { getChatProvidersStatus } from "@/features/ai/server/chatProvider";
import { authenticateApiRequest } from "@/features/auth/server/session";
import {
  createApiResponseHeaders,
  createRequestId,
} from "@/features/http/server/apiResponse";

export async function GET() {
  const requestId = createRequestId();
  const authentication = await authenticateApiRequest(requestId);

  if (!authentication.ok) {
    return authentication.response;
  }

  // 企业重点：状态接口只返回非敏感配置，绝不返回 API Key、Authorization 或完整环境变量。
  return Response.json(getChatProvidersStatus(), {
    headers: createApiResponseHeaders(requestId),
  });
}
