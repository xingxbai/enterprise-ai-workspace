import { getChatProviderStatus } from "@/features/ai/server/chatProvider";

export async function GET() {
  // 企业重点：状态接口只返回非敏感配置，绝不返回 API Key、Authorization 或完整环境变量。
  return Response.json(getChatProviderStatus());
}
