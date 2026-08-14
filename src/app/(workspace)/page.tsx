import {
  BookOpenCheck,
  CircleAlert,
  Clock3,
  TicketCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

import PageHeader from "@/components/workspace/pageHeader";
import StatusBadge from "@/components/workspace/statusBadge";
import {
  getAuditEvents,
  getCustomers,
  getKnowledgeArticles,
  getLegacyTickets,
  getTeamMembers,
} from "@/data/legacySystem";

export default async function DashboardPage() {
  const tickets = await getLegacyTickets();
  const customers = getCustomers();
  const knowledgeArticles = getKnowledgeArticles();
  const members = getTeamMembers();
  const auditEvents = getAuditEvents();
  const openTickets = tickets.filter((ticket) => ticket.status !== "已解决");
  const highPriorityTickets = openTickets.filter(
    (ticket) => ticket.priority === "高",
  );

  const metrics = [
    {
      detail: `${highPriorityTickets.length} 条高优先级`,
      icon: TicketCheck,
      label: "未解决工单",
      value: openTickets.length,
    },
    {
      detail: "按人工设置的 SLA 截止时间",
      icon: Clock3,
      label: "今日需跟进",
      value: openTickets.filter((ticket) => ticket.slaDueAt.includes("2026-08-14"))
        .length,
    },
    {
      detail: `${customers.filter((customer) => customer.health === "风险").length} 家需重点关注`,
      icon: Users,
      label: "服务客户",
      value: customers.length,
    },
    {
      detail: `${knowledgeArticles.filter((article) => article.status !== "已发布").length} 篇待完善`,
      icon: BookOpenCheck,
      label: "已发布知识",
      value: knowledgeArticles.filter((article) => article.status === "已发布")
        .length,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Link
            className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700"
            href="/tickets"
          >
            查看全部工单
          </Link>
        }
        description="查看客服队列、SLA 规则提醒和团队负载。当前为未接入 AI 的人工运营基线。"
        eyebrow="Operations overview"
        title="服务工作台"
      />

      <section aria-label="关键指标" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              className="rounded-lg border border-zinc-200 bg-white p-4"
              key={metric.label}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-600">{metric.label}</p>
                <Icon aria-hidden="true" className="size-4 text-zinc-400" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{metric.detail}</p>
            </article>
          );
        })}
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">待处理队列</h2>
              <p className="mt-1 text-sm text-zinc-500">按优先级和更新时间人工排序</p>
            </div>
            <Link className="text-sm font-medium text-zinc-700 hover:text-zinc-950" href="/tickets">
              全部工单
            </Link>
          </div>
          <div className="overflow-x-auto border-y border-zinc-200 bg-white">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">工单</th>
                  <th className="px-4 py-3 font-medium">客户</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">优先级</th>
                  <th className="px-4 py-3 font-medium">负责人</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {openTickets.slice(0, 5).map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="px-4 py-3">
                      <Link
                        className="font-medium text-zinc-950 hover:underline"
                        href={`/tickets/${ticket.id}`}
                      >
                        {ticket.subject}
                      </Link>
                      <p className="mt-1 text-xs text-zinc-500">{ticket.id}</p>
                    </td>
                    <td className="px-4 py-3">{ticket.customerName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge>{ticket.status}</StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge>{ticket.priority}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{ticket.assignee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold">规则提醒</h2>
            <p className="mt-1 text-sm text-zinc-500">旧系统通过固定规则识别风险</p>
          </div>
          <div className="space-y-2">
            {highPriorityTickets.slice(0, 3).map((ticket) => (
              <article
                className="rounded-lg border border-red-100 bg-white p-4"
                key={ticket.id}
              >
                <div className="flex items-start gap-3">
                  <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">高优先级工单待处理</p>
                    <Link
                      className="mt-1 block truncate text-sm text-zinc-600 hover:text-zinc-950"
                      href={`/tickets/${ticket.id}`}
                    >
                      {ticket.subject}
                    </Link>
                    <p className="mt-2 text-xs text-zinc-500">SLA：{ticket.slaDueAt}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold">团队负载</h2>
            <p className="mt-1 text-sm text-zinc-500">基于人工分配的当前工单量</p>
          </div>
          <div className="divide-y divide-zinc-200 border-y border-zinc-200 bg-white">
            {members.slice(0, 5).map((member) => (
              <div className="flex items-center justify-between gap-4 px-4 py-3" key={member.id}>
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{member.team}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{member.openTicketCount} 条处理中</p>
                  <p className="mt-1 text-xs text-zinc-500">今日解决 {member.resolvedToday}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold">最近操作</h2>
            <p className="mt-1 text-sm text-zinc-500">业务审计记录</p>
          </div>
          <div className="divide-y divide-zinc-200 border-y border-zinc-200 bg-white">
            {auditEvents.slice(0, 4).map((event) => (
              <div className="flex gap-3 px-4 py-3" key={event.id}>
                <div className="mt-1 size-2 shrink-0 rounded-full bg-zinc-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm">{event.detail}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {event.actor} · {event.createdAt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
