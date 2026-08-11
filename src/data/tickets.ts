import "server-only";

export type TicketSummary = {
  id: string;
  subject: string;
  customerName: string;
  status: "待处理" | "处理中" | "已解决";
  priority: "低" | "中" | "高";
  updatedAt: string;
};

const demoTicketSummaries = [
  {
    customerName: "星河制造",
    id: "TICKET-20260811-001",
    priority: "高",
    status: "待处理",
    subject: "生产看板无法加载最新订单数据",
    updatedAt: "2026-08-11 09:35",
  },
  {
    customerName: "青藤教育",
    id: "TICKET-20260811-002",
    priority: "中",
    status: "处理中",
    subject: "批量导入学员名单后出现重复记录",
    updatedAt: "2026-08-11 10:12",
  },
  {
    customerName: "远航物流",
    id: "TICKET-20260811-003",
    priority: "高",
    status: "处理中",
    subject: "客户无法查看跨区域运输轨迹",
    updatedAt: "2026-08-11 11:08",
  },
  {
    customerName: "北辰医疗",
    id: "TICKET-20260810-004",
    priority: "中",
    status: "待处理",
    subject: "审批流节点偶发停留在上一处理人",
    updatedAt: "2026-08-10 17:46",
  },
  {
    customerName: "云岭零售",
    id: "TICKET-20260810-005",
    priority: "低",
    status: "已解决",
    subject: "门店日报导出字段顺序需要调整",
    updatedAt: "2026-08-10 15:20",
  },
  {
    customerName: "晨光能源",
    id: "TICKET-20260809-006",
    priority: "高",
    status: "待处理",
    subject: "异常用量告警没有触达值班负责人",
    updatedAt: "2026-08-09 20:18",
  },
] satisfies readonly TicketSummary[];

function getTicketsApiBaseUrl() {
  const baseUrl = process.env.TICKETS_API_BASE_URL;

  if (!baseUrl) {
    return null;
  }

  return new URL(baseUrl);
}

export function createTicketsApiUrl(path: string) {
  const baseUrl = getTicketsApiBaseUrl();

  if (!baseUrl) {
    return null;
  }

  const normalizedBaseUrl = baseUrl.href.endsWith("/")
    ? baseUrl.href
    : `${baseUrl.href}/`;

  return new URL(path.replace(/^\/+/, ""), normalizedBaseUrl);
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

function recordTicketApiFallback(reason: unknown) {
  const details =
    reason instanceof Error
      ? {
          message: reason.message.slice(0, 300),
          name: reason.name,
        }
      : {
          type: typeof reason,
        };

  // 企业重点：降级日志只记录错误类型，不记录 Authorization 或客户敏感正文。
  console.error("工单 API 不可用，已降级为学习演示种子数据", details);
}

export async function getTicketSummaries(): Promise<
  readonly TicketSummary[]
> {
  const ticketsUrl = createTicketsApiUrl("tickets");

  if (!ticketsUrl) {
    // 企业重点：这是学习和面试演示用种子数据，不冒充真实业务 API 已接入。
    return demoTicketSummaries;
  }

  let response: Response;

  try {
    response = await fetch(ticketsUrl, {
      cache: "no-store",
      headers: getBusinessApiHeaders(),
    });
  } catch (error) {
    recordTicketApiFallback(error);
    return demoTicketSummaries;
  }

  if (!response.ok) {
    recordTicketApiFallback(new Error(`工单 API 返回 ${response.status}`));
    return demoTicketSummaries;
  }

  return (await response.json()) as readonly TicketSummary[];
}

export async function getTicketSummaryById(ticketId: string) {
  const tickets = await getTicketSummaries();

  return tickets.find((ticket) => ticket.id === ticketId) ?? null;
}
