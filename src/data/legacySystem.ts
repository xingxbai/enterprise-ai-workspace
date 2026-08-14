import "server-only";

import { getTicketSummaries, type TicketSummary } from "@/data/tickets";

export type TicketChannel = "企业微信" | "电话" | "邮件" | "网页";

export type TicketTimelineItem = {
  actor: string;
  content: string;
  createdAt: string;
  type: "客户消息" | "内部记录" | "状态变更";
};

export type LegacyTicket = TicketSummary & {
  assignee: string;
  category: string;
  channel: TicketChannel;
  customerId: string;
  description: string;
  slaDueAt: string;
  tags: readonly string[];
  timeline: readonly TicketTimelineItem[];
};

export type Customer = {
  contractTier: "标准版" | "专业版" | "企业版";
  health: "健康" | "关注" | "风险";
  id: string;
  industry: string;
  lastContactAt: string;
  name: string;
  openTicketCount: number;
  owner: string;
  primaryContact: string;
  region: string;
};

export type KnowledgeArticle = {
  category: string;
  helpfulRate: number;
  id: string;
  owner: string;
  status: "草稿" | "已发布" | "审核中";
  summary: string;
  tags: readonly string[];
  title: string;
  updatedAt: string;
  views: number;
};

export type TeamMember = {
  id: string;
  name: string;
  openTicketCount: number;
  resolvedToday: number;
  role: "客服专员" | "客服主管" | "知识管理员" | "系统管理员";
  status: "在线" | "忙碌" | "离线";
  team: string;
};

export type AuditEvent = {
  action: string;
  actor: string;
  createdAt: string;
  detail: string;
  id: string;
  ip: string;
  resource: string;
  result: "成功" | "失败";
};

const ticketDetails: Record<
  string,
  Omit<LegacyTicket, keyof TicketSummary>
> = {
  "TICKET-20260811-001": {
    assignee: "林晓",
    category: "数据同步",
    channel: "企业微信",
    customerId: "CUSTOMER-001",
    description:
      "客户反馈生产看板从上午 8 点后不再刷新，订单中心已有新数据，但看板仍停留在昨日汇总。该看板用于早会排产，需要尽快恢复。",
    slaDueAt: "2026-08-14 12:00",
    tags: ["生产阻断", "数据延迟", "企业客户"],
    timeline: [
      {
        actor: "周工",
        content: "生产看板订单数据没有更新，请协助确认。",
        createdAt: "2026-08-11 09:35",
        type: "客户消息",
      },
      {
        actor: "林晓",
        content: "已确认订单中心数据正常，正在排查同步任务。",
        createdAt: "2026-08-11 09:48",
        type: "内部记录",
      },
    ],
  },
  "TICKET-20260811-002": {
    assignee: "陈航",
    category: "数据导入",
    channel: "网页",
    customerId: "CUSTOMER-002",
    description:
      "客户批量导入 860 名学员后出现 27 条重复记录，希望确认去重规则并提供安全处理方案。",
    slaDueAt: "2026-08-14 18:00",
    tags: ["批量导入", "重复数据"],
    timeline: [
      {
        actor: "王老师",
        content: "导入完成后出现重复学员，暂未继续操作。",
        createdAt: "2026-08-11 10:12",
        type: "客户消息",
      },
      {
        actor: "陈航",
        content: "工单状态改为处理中。",
        createdAt: "2026-08-11 10:26",
        type: "状态变更",
      },
    ],
  },
  "TICKET-20260811-003": {
    assignee: "赵宁",
    category: "权限配置",
    channel: "电话",
    customerId: "CUSTOMER-003",
    description:
      "华东区客户账号可以看到区内轨迹，但跨区域运输节点为空。客户希望在当日发车前完成权限核对。",
    slaDueAt: "2026-08-14 14:30",
    tags: ["权限", "运输轨迹", "时效敏感"],
    timeline: [
      {
        actor: "李经理",
        content: "跨区域运输轨迹为空，影响调度确认。",
        createdAt: "2026-08-11 11:08",
        type: "客户消息",
      },
    ],
  },
  "TICKET-20260810-004": {
    assignee: "林晓",
    category: "审批流程",
    channel: "邮件",
    customerId: "CUSTOMER-004",
    description:
      "采购审批在第二节点处理完成后偶发仍显示上一处理人，刷新后状态不变，需要核对流程实例。",
    slaDueAt: "2026-08-15 10:00",
    tags: ["审批", "状态异常"],
    timeline: [
      {
        actor: "刘主任",
        content: "已提供两个异常流程编号。",
        createdAt: "2026-08-10 17:46",
        type: "客户消息",
      },
    ],
  },
  "TICKET-20260810-005": {
    assignee: "陈航",
    category: "报表配置",
    channel: "网页",
    customerId: "CUSTOMER-005",
    description:
      "门店日报导出字段顺序与财务模板不一致，需要调整为门店、日期、销售额、退款额、净收入。",
    slaDueAt: "2026-08-13 18:00",
    tags: ["报表", "字段配置"],
    timeline: [
      {
        actor: "孙会计",
        content: "确认新字段顺序符合财务模板。",
        createdAt: "2026-08-10 15:20",
        type: "客户消息",
      },
      {
        actor: "陈航",
        content: "工单状态改为已解决。",
        createdAt: "2026-08-10 16:08",
        type: "状态变更",
      },
    ],
  },
  "TICKET-20260809-006": {
    assignee: "赵宁",
    category: "消息通知",
    channel: "企业微信",
    customerId: "CUSTOMER-006",
    description:
      "异常用量告警已生成但未发送给值班负责人，客户担心夜间告警继续遗漏。",
    slaDueAt: "2026-08-14 11:30",
    tags: ["告警", "通知失败", "高风险"],
    timeline: [
      {
        actor: "马工",
        content: "昨晚两次异常告警均未收到企业微信通知。",
        createdAt: "2026-08-09 20:18",
        type: "客户消息",
      },
    ],
  },
};

const customerFixtures = [
  {
    contractTier: "企业版",
    health: "风险",
    id: "CUSTOMER-001",
    industry: "智能制造",
    lastContactAt: "2026-08-14 09:42",
    name: "星河制造",
    openTicketCount: 3,
    owner: "顾问一组",
    primaryContact: "周工",
    region: "华东",
  },
  {
    contractTier: "专业版",
    health: "关注",
    id: "CUSTOMER-002",
    industry: "职业教育",
    lastContactAt: "2026-08-14 10:16",
    name: "青藤教育",
    openTicketCount: 2,
    owner: "顾问二组",
    primaryContact: "王老师",
    region: "华北",
  },
  {
    contractTier: "企业版",
    health: "关注",
    id: "CUSTOMER-003",
    industry: "物流运输",
    lastContactAt: "2026-08-14 08:55",
    name: "远航物流",
    openTicketCount: 4,
    owner: "顾问一组",
    primaryContact: "李经理",
    region: "华东",
  },
  {
    contractTier: "企业版",
    health: "健康",
    id: "CUSTOMER-004",
    industry: "医疗服务",
    lastContactAt: "2026-08-13 17:40",
    name: "北辰医疗",
    openTicketCount: 1,
    owner: "顾问三组",
    primaryContact: "刘主任",
    region: "华南",
  },
  {
    contractTier: "标准版",
    health: "健康",
    id: "CUSTOMER-005",
    industry: "连锁零售",
    lastContactAt: "2026-08-12 15:08",
    name: "云岭零售",
    openTicketCount: 0,
    owner: "顾问二组",
    primaryContact: "孙会计",
    region: "西南",
  },
  {
    contractTier: "专业版",
    health: "风险",
    id: "CUSTOMER-006",
    industry: "新能源",
    lastContactAt: "2026-08-14 07:50",
    name: "晨光能源",
    openTicketCount: 3,
    owner: "顾问三组",
    primaryContact: "马工",
    region: "华北",
  },
] satisfies readonly Customer[];

const knowledgeFixtures = [
  {
    category: "数据同步",
    helpfulRate: 94,
    id: "KB-001",
    owner: "知识运营组",
    status: "已发布",
    summary: "排查订单数据同步任务延迟、失败和重复消费的标准步骤。",
    tags: ["订单", "同步任务", "数据延迟"],
    title: "订单看板数据未更新排查手册",
    updatedAt: "2026-08-12 16:30",
    views: 1286,
  },
  {
    category: "数据导入",
    helpfulRate: 91,
    id: "KB-002",
    owner: "实施支持组",
    status: "已发布",
    summary: "说明批量导入唯一键、重复数据处理和回滚注意事项。",
    tags: ["批量导入", "去重", "回滚"],
    title: "学员批量导入与去重规则",
    updatedAt: "2026-08-11 13:20",
    views: 862,
  },
  {
    category: "权限配置",
    helpfulRate: 88,
    id: "KB-003",
    owner: "平台支持组",
    status: "已发布",
    summary: "区域、组织和数据范围权限的核对清单。",
    tags: ["RBAC", "数据范围", "区域"],
    title: "跨区域运输轨迹权限配置",
    updatedAt: "2026-08-10 18:10",
    views: 635,
  },
  {
    category: "审批流程",
    helpfulRate: 86,
    id: "KB-004",
    owner: "流程产品组",
    status: "审核中",
    summary: "审批实例节点停留、回调失败和状态修复流程。",
    tags: ["审批流", "节点", "回调"],
    title: "审批节点状态异常处理指南",
    updatedAt: "2026-08-14 09:10",
    views: 241,
  },
  {
    category: "消息通知",
    helpfulRate: 79,
    id: "KB-005",
    owner: "平台支持组",
    status: "草稿",
    summary: "企业微信告警通知链路、模板和接收人配置排查。",
    tags: ["告警", "企业微信", "通知"],
    title: "告警通知未触达排查清单",
    updatedAt: "2026-08-14 10:05",
    views: 96,
  },
] satisfies readonly KnowledgeArticle[];

const teamFixtures = [
  {
    id: "USER-DEMO-CS-001",
    name: "演示客服",
    openTicketCount: 2,
    resolvedToday: 3,
    role: "客服专员",
    status: "在线",
    team: "一线支持组",
  },
  {
    id: "USER-002",
    name: "林晓",
    openTicketCount: 5,
    resolvedToday: 4,
    role: "客服专员",
    status: "忙碌",
    team: "一线支持组",
  },
  {
    id: "USER-003",
    name: "陈航",
    openTicketCount: 3,
    resolvedToday: 5,
    role: "客服专员",
    status: "在线",
    team: "一线支持组",
  },
  {
    id: "USER-004",
    name: "赵宁",
    openTicketCount: 4,
    resolvedToday: 2,
    role: "客服专员",
    status: "离线",
    team: "二线技术组",
  },
  {
    id: "USER-005",
    name: "许主管",
    openTicketCount: 1,
    resolvedToday: 1,
    role: "客服主管",
    status: "在线",
    team: "客户成功部",
  },
  {
    id: "USER-006",
    name: "顾文",
    openTicketCount: 0,
    resolvedToday: 0,
    role: "知识管理员",
    status: "在线",
    team: "知识运营组",
  },
] satisfies readonly TeamMember[];

const auditFixtures = [
  {
    action: "查看工单",
    actor: "演示客服",
    createdAt: "2026-08-14 11:28:06",
    detail: "查看工单 TICKET-20260811-001",
    id: "AUDIT-001",
    ip: "10.20.4.18",
    resource: "工单",
    result: "成功",
  },
  {
    action: "更新状态",
    actor: "林晓",
    createdAt: "2026-08-14 11:16:42",
    detail: "将工单 TICKET-20260811-003 更新为处理中",
    id: "AUDIT-002",
    ip: "10.20.4.23",
    resource: "工单",
    result: "成功",
  },
  {
    action: "发布知识",
    actor: "顾文",
    createdAt: "2026-08-14 10:51:09",
    detail: "提交知识文章 KB-004 进入审核",
    id: "AUDIT-003",
    ip: "10.20.6.12",
    resource: "知识库",
    result: "成功",
  },
  {
    action: "导出客户",
    actor: "许主管",
    createdAt: "2026-08-14 10:22:30",
    detail: "导出华东区企业版客户列表",
    id: "AUDIT-004",
    ip: "10.20.3.11",
    resource: "客户",
    result: "成功",
  },
  {
    action: "审批工单",
    actor: "陈航",
    createdAt: "2026-08-14 09:58:14",
    detail: "上游审批服务响应超时",
    id: "AUDIT-005",
    ip: "10.20.4.25",
    resource: "工单",
    result: "失败",
  },
] satisfies readonly AuditEvent[];

function isDemoBusinessDataEnabled() {
  // Demo fixture 只服务本地课程演示，生产环境必须接入真实业务数据源。
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_DEMO_FIXTURES !== "false"
  );
}

function createDefaultTicketDetail(
  summary: TicketSummary,
): Omit<LegacyTicket, keyof TicketSummary> {
  return {
    assignee: "待分配",
    category: "其他",
    channel: "网页",
    customerId: "UNKNOWN",
    description: summary.subject,
    slaDueAt: "待确认",
    tags: [],
    timeline: [],
  };
}

export async function getLegacyTickets(): Promise<readonly LegacyTicket[]> {
  // 工单摘要优先复用已有业务 API Adapter，再补充旧系统详情字段。
  const summaries = await getTicketSummaries();

  return summaries.map((summary) => ({
    ...summary,
    ...(ticketDetails[summary.id] ?? createDefaultTicketDetail(summary)),
  }));
}

export async function getLegacyTicketById(ticketId: string) {
  const tickets = await getLegacyTickets();
  return tickets.find((ticket) => ticket.id === ticketId) ?? null;
}

export function getCustomers(): readonly Customer[] {
  return isDemoBusinessDataEnabled() ? customerFixtures : [];
}

export function getCustomerById(customerId: string) {
  return getCustomers().find((customer) => customer.id === customerId) ?? null;
}

export function getKnowledgeArticles(): readonly KnowledgeArticle[] {
  return isDemoBusinessDataEnabled() ? knowledgeFixtures : [];
}

export function getTeamMembers(): readonly TeamMember[] {
  return isDemoBusinessDataEnabled() ? teamFixtures : [];
}

export function getAuditEvents(): readonly AuditEvent[] {
  return isDemoBusinessDataEnabled() ? auditFixtures : [];
}
