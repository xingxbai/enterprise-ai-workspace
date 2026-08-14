import { Search } from "lucide-react";
import Link from "next/link";

import EmptyState from "@/components/workspace/emptyState";
import PageHeader from "@/components/workspace/pageHeader";
import StatusBadge from "@/components/workspace/statusBadge";
import { getLegacyTickets } from "@/data/legacySystem";

type TicketSearchParams = Promise<{
  priority?: string | string[];
  q?: string | string[];
  status?: string | string[];
}>;

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: TicketSearchParams;
}) {
  const params = await searchParams;
  const query = readParam(params.q).toLowerCase();
  const status = readParam(params.status);
  const priority = readParam(params.priority);
  const tickets = await getLegacyTickets();
  const filteredTickets = tickets.filter((ticket) => {
    const matchesQuery =
      !query ||
      [ticket.id, ticket.subject, ticket.customerName, ticket.assignee]
        .join(" ")
        .toLowerCase()
        .includes(query);
    return (
      matchesQuery &&
      (!status || ticket.status === status) &&
      (!priority || ticket.priority === priority)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        description="查询、筛选并跟进客户问题。分类、优先级和负责人当前由客服人工维护。"
        eyebrow="Ticket operations"
        title="工单管理"
      />

      <form className="grid gap-3 border-y border-zinc-200 bg-white p-4 md:grid-cols-[minmax(14rem,1fr)_12rem_10rem_auto]">
        <label className="relative block">
          <span className="sr-only">搜索工单</span>
          <Search aria-hidden="true" className="absolute left-3 top-2.5 size-4 text-zinc-400" />
          <input
            className="h-9 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-500"
            defaultValue={readParam(params.q)}
            name="q"
            placeholder="编号、主题、客户或负责人"
          />
        </label>
        <select
          className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm"
          defaultValue={status}
          name="status"
        >
          <option value="">全部状态</option>
          <option value="待处理">待处理</option>
          <option value="处理中">处理中</option>
          <option value="已解决">已解决</option>
        </select>
        <select
          className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm"
          defaultValue={priority}
          name="priority"
        >
          <option value="">全部优先级</option>
          <option value="高">高</option>
          <option value="中">中</option>
          <option value="低">低</option>
        </select>
        <div className="flex gap-2">
          <button className="h-9 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700" type="submit">
            筛选
          </button>
          <Link className="inline-flex h-9 items-center rounded-md px-3 text-sm text-zinc-600 hover:bg-zinc-100" href="/tickets">
            重置
          </Link>
        </div>
      </form>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">共 {filteredTickets.length} 条结果</p>
        <p className="text-xs text-zinc-400">数据源：业务 API / demo fixture</p>
      </div>

      {filteredTickets.length > 0 ? (
        <div className="overflow-x-auto border-y border-zinc-200 bg-white">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">工单</th>
                <th className="px-4 py-3 font-medium">客户</th>
                <th className="px-4 py-3 font-medium">分类</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">优先级</th>
                <th className="px-4 py-3 font-medium">负责人</th>
                <th className="px-4 py-3 font-medium">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredTickets.map((ticket) => (
                <tr className="hover:bg-zinc-50" key={ticket.id}>
                  <td className="max-w-md px-4 py-3">
                    <Link className="font-medium text-zinc-950 hover:underline" href={`/tickets/${ticket.id}`}>
                      {ticket.subject}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">{ticket.id} · {ticket.channel}</p>
                  </td>
                  <td className="px-4 py-3">{ticket.customerName}</td>
                  <td className="px-4 py-3 text-zinc-600">{ticket.category}</td>
                  <td className="px-4 py-3"><StatusBadge>{ticket.status}</StatusBadge></td>
                  <td className="px-4 py-3"><StatusBadge>{ticket.priority}</StatusBadge></td>
                  <td className="px-4 py-3 text-zinc-600">{ticket.assignee}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{ticket.slaDueAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="没有符合当前筛选条件的工单" />
      )}
    </div>
  );
}
