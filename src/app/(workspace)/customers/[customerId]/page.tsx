import { ArrowLeft, Building2, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import PageHeader from "@/components/workspace/pageHeader";
import StatusBadge from "@/components/workspace/statusBadge";
import {
  getCustomerById,
  getLegacyTickets,
} from "@/data/legacySystem";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const customer = getCustomerById(customerId);

  if (!customer) {
    notFound();
  }

  const tickets = (await getLegacyTickets()).filter(
    (ticket) => ticket.customerId === customer.id,
  );

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-950" href="/customers">
        <ArrowLeft aria-hidden="true" className="size-4" />返回客户列表
      </Link>
      <PageHeader
        actions={<StatusBadge>{customer.health}</StatusBadge>}
        description={`${customer.id} · ${customer.contractTier}`}
        eyebrow="Customer profile"
        title={customer.name}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold">相关工单</h2>
            <p className="mt-1 text-sm text-zinc-500">客户当前问题及历史处理记录</p>
          </div>
          {tickets.length > 0 ? (
            <div className="divide-y divide-zinc-200 border-y border-zinc-200 bg-white">
              {tickets.map((ticket) => (
                <div className="flex flex-col justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center" key={ticket.id}>
                  <div>
                    <Link className="text-sm font-medium hover:underline" href={`/tickets/${ticket.id}`}>{ticket.subject}</Link>
                    <p className="mt-1 text-xs text-zinc-500">{ticket.id} · {ticket.updatedAt}</p>
                  </div>
                  <div className="flex gap-2"><StatusBadge>{ticket.status}</StatusBadge><StatusBadge>{ticket.priority}</StatusBadge></div>
                </div>
              ))}
            </div>
          ) : (
            <p className="border-y border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">暂无相关工单</p>
          )}
        </section>

        <aside className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold">基础信息</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex gap-3"><Building2 aria-hidden="true" className="mt-0.5 size-4 text-zinc-400" /><div><dt className="text-xs text-zinc-500">行业</dt><dd className="mt-1">{customer.industry}</dd></div></div>
            <div className="flex gap-3"><MapPin aria-hidden="true" className="mt-0.5 size-4 text-zinc-400" /><div><dt className="text-xs text-zinc-500">区域</dt><dd className="mt-1">{customer.region}</dd></div></div>
            <div className="flex gap-3"><UserRound aria-hidden="true" className="mt-0.5 size-4 text-zinc-400" /><div><dt className="text-xs text-zinc-500">主要联系人</dt><dd className="mt-1">{customer.primaryContact}</dd></div></div>
            <div><dt className="text-xs text-zinc-500">客户负责人</dt><dd className="mt-1">{customer.owner}</dd></div>
            <div><dt className="text-xs text-zinc-500">最近联系</dt><dd className="mt-1">{customer.lastContactAt}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
