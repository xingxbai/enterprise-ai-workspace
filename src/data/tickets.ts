import "server-only";

export type TicketSummary = {
  id: string;
  subject: string;
  customerName: string;
  status: "待处理" | "处理中" | "已解决";
  priority: "低" | "中" | "高";
  updatedAt: string;
};
const mockTikectSummaries: TicketSummary[] = [
  {
    id: "TICKET-001",
    subject: "无法登录系统",
    customerName: "张三",
    status: "待处理",
    priority: "高",
    updatedAt: "2023-07-01 10:30:00",
  },
  {
    id: "TICKET-002",
    subject: "系统报错提示",
    customerName: "李四",
    status: "处理中",
    priority: "中",
    updatedAt: "2023-07-02 14:15:00",
  }
]
export async function getTicketSummaries(): Promise<
  readonly TicketSummary[]
> {
  // 企业重点：真实工单 API 接入前保持空集合，避免用模拟记录冒充业务数据。
  return mockTikectSummaries;
}
