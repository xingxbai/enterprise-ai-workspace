import { ArrowLeft, Clock3, MessageSquareText, Tag, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import PageHeader from "@/components/workspace/pageHeader";
import StatusBadge from "@/components/workspace/statusBadge";
import {
  getCustomerById,
  getKnowledgeArticles,
  getLegacyTicketById,
} from "@/data/legacySystem";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const ticket = await getLegacyTicketById(ticketId);

  if (!ticket) {
    notFound();
  }

  const customer = getCustomerById(ticket.customerId);
  const relatedArticles = getKnowledgeArticles().filter(
    (article) => article.category === ticket.category,
  );

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-950" href="/tickets">
        <ArrowLeft aria-hidden="true" className="size-4" />
        返回工单列表
      </Link>

      <PageHeader
        actions={<div className="flex gap-2"><StatusBadge>{ticket.status}</StatusBadge><StatusBadge>{ticket.priority}</StatusBadge></div>}
        description={ticket.id}
        eyebrow={`${ticket.customerName} · ${ticket.channel}`}
        title={ticket.subject}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <section className="border-y border-zinc-200 bg-white px-5 py-5">
            <h2 className="text-base font-semibold">问题描述</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-700">{ticket.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ticket.tags.map((tag) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600" key={tag}>
                  <Tag aria-hidden="true" className="size-3" />{tag}
                </span>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-base font-semibold">沟通与处理记录</h2>
              <p className="mt-1 text-sm text-zinc-500">人工记录的客户消息和内部处理进展</p>
            </div>
            <div className="space-y-3">
              {ticket.timeline.map((item) => (
                <article className="rounded-lg border border-zinc-200 bg-white p-4" key={`${item.createdAt}-${item.actor}`}>
                  <div className="flex items-start gap-3">
                    <MessageSquareText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{item.actor}</span>
                        <span className="text-xs text-zinc-500">{item.type}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-700">{item.content}</p>
                      <p className="mt-2 text-xs text-zinc-400">{item.createdAt}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-base font-semibold">相关知识</h2>
              <p className="mt-1 text-sm text-zinc-500">当前通过人工分类匹配同类知识文章</p>
            </div>
            {relatedArticles.length > 0 ? (
              <div className="divide-y divide-zinc-200 border-y border-zinc-200 bg-white">
                {relatedArticles.map((article) => (
                  <div className="px-4 py-3" key={article.id}>
                    <p className="text-sm font-medium">{article.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">{article.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-y border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">暂无同分类知识</p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold">处理信息</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex gap-3"><UserRound aria-hidden="true" className="mt-0.5 size-4 text-zinc-400" /><div><dt className="text-xs text-zinc-500">负责人</dt><dd className="mt-1">{ticket.assignee}</dd></div></div>
              <div className="flex gap-3"><Clock3 aria-hidden="true" className="mt-0.5 size-4 text-zinc-400" /><div><dt className="text-xs text-zinc-500">SLA 截止时间</dt><dd className="mt-1">{ticket.slaDueAt}</dd></div></div>
              <div><dt className="text-xs text-zinc-500">人工分类</dt><dd className="mt-1">{ticket.category}</dd></div>
              <div><dt className="text-xs text-zinc-500">最近更新</dt><dd className="mt-1">{ticket.updatedAt}</dd></div>
            </dl>
          </section>

          {customer ? (
            <section className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-semibold">客户信息</h2>
              <p className="mt-3 text-sm font-medium">{customer.name}</p>
              <p className="mt-1 text-xs text-zinc-500">{customer.industry} · {customer.region}</p>
              <Link className="mt-4 inline-flex text-sm font-medium text-zinc-700 hover:text-zinc-950" href={`/customers/${customer.id}`}>查看客户档案</Link>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
