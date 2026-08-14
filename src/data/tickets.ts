import "server-only";

import {
  canUseDemoTicketFixtures,
  parseTicketSummaries,
  type TicketSummary,
} from "@/data/ticketContracts";

export type { TicketSummary } from "@/data/ticketContracts";

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

  try {
    return new URL(baseUrl);
  } catch {
    return null;
  }
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

type TicketApiFailureKind =
  | "authentication"
  | "configuration"
  | "network"
  | "response"
  | "validation";

function areDemoTicketFixturesEnabled(failureKind: TicketApiFailureKind) {
  return canUseDemoTicketFixtures({
    enabledFlag: process.env.ENABLE_DEMO_FIXTURES,
    failureKind,
    nodeEnv: process.env.NODE_ENV,
  });
}

function recordTicketApiFailure(input: {
  kind: TicketApiFailureKind;
  status?: number;
  usedDemoFixtures: boolean;
}) {
  // 企业重点：只记录白名单诊断字段，不记录上游错误正文、Authorization 或客户数据。
  console.warn("工单 API 读取失败，已按环境策略降级", input);
}

function getFallbackTickets(
  kind: TicketApiFailureKind,
  status?: number,
): readonly TicketSummary[] {
  const usedDemoFixtures = areDemoTicketFixturesEnabled(kind);

  recordTicketApiFailure({ kind, status, usedDemoFixtures });

  return usedDemoFixtures ? demoTicketSummaries : [];
}

export async function getTicketSummaries(): Promise<
  readonly TicketSummary[]
> {
  const ticketsUrl = createTicketsApiUrl("tickets");

  if (!ticketsUrl) {
    return getFallbackTickets("configuration");
  }

  let response: Response;

  try {
    response = await fetch(ticketsUrl, {
      cache: "no-store",
      headers: getBusinessApiHeaders(),
    });
  } catch {
    return getFallbackTickets("network");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return getFallbackTickets("authentication", response.status);
    }

    return getFallbackTickets("response", response.status);
  }

  let responseBody: unknown;

  try {
    responseBody = await response.json();
  } catch {
    return getFallbackTickets("validation");
  }

  const parsedTickets = parseTicketSummaries(responseBody);

  if (!parsedTickets.success) {
    return getFallbackTickets("validation");
  }

  return parsedTickets.data;
}

export async function getTicketSummaryById(ticketId: string) {
  const tickets = await getTicketSummaries();

  return tickets.find((ticket) => ticket.id === ticketId) ?? null;
}
