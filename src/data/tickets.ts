import "server-only";

export type TicketSummary = {
  id: string;
  subject: string;
  customerName: string;
  status: "待处理" | "处理中" | "已解决";
  priority: "低" | "中" | "高";
  updatedAt: string;
};

function getTicketsApiBaseUrl() {
  const baseUrl = process.env.TICKETS_API_BASE_URL;

  if (!baseUrl) {
    return null;
  }

  return new URL(baseUrl);
}

export function getBusinessApiHeaders() {
  const headers = new Headers({
    Accept: "application/json",
  });
  const token = process.env.TICKETS_API_TOKEN;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export async function getTicketSummaries(): Promise<
  readonly TicketSummary[]
> {
  // 企业重点：真实工单 API 接入前保持空集合，避免用模拟记录冒充业务数据。
  const baseUrl = getTicketsApiBaseUrl();

  if (!baseUrl) {
    return [];
  }

  const response = await fetch(new URL("/tickets", baseUrl), {
    cache: "no-store",
    headers: getBusinessApiHeaders(),
  });

  if (!response.ok) {
    throw new Error("读取工单列表失败");
  }

  return (await response.json()) as readonly TicketSummary[];
}
