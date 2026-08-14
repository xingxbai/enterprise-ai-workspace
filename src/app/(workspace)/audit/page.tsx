import EmptyState from "@/components/workspace/emptyState";
import PageHeader from "@/components/workspace/pageHeader";
import StatusBadge from "@/components/workspace/statusBadge";
import { getAuditEvents } from "@/data/legacySystem";

export default function AuditPage() {
  const events = getAuditEvents();

  return (
    <div className="space-y-6">
      <PageHeader
        description="追踪敏感业务操作、失败请求和资源访问。日志只展示白名单业务字段。"
        eyebrow="Audit trail"
        title="审计记录"
      />

      {events.length > 0 ? (
        <div className="overflow-x-auto border-y border-zinc-200 bg-white">
          <table className="w-full min-w-[58rem] text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500"><tr><th className="px-4 py-3 font-medium">时间</th><th className="px-4 py-3 font-medium">操作人</th><th className="px-4 py-3 font-medium">资源</th><th className="px-4 py-3 font-medium">动作</th><th className="px-4 py-3 font-medium">详情</th><th className="px-4 py-3 font-medium">IP</th><th className="px-4 py-3 font-medium">结果</th></tr></thead>
            <tbody className="divide-y divide-zinc-200">
              {events.map((event) => <tr key={event.id}><td className="whitespace-nowrap px-4 py-3 text-zinc-600">{event.createdAt}</td><td className="px-4 py-3 font-medium">{event.actor}</td><td className="px-4 py-3">{event.resource}</td><td className="px-4 py-3">{event.action}</td><td className="max-w-md px-4 py-3 text-zinc-600">{event.detail}</td><td className="px-4 py-3 font-mono text-xs text-zinc-500">{event.ip}</td><td className="px-4 py-3"><StatusBadge>{event.result}</StatusBadge></td></tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="暂无审计记录" />
      )}
    </div>
  );
}
