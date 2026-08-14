import PageHeader from "@/components/workspace/pageHeader";
import StatusBadge from "@/components/workspace/statusBadge";
import { getTeamMembers } from "@/data/legacySystem";

const permissionRows = [
  { permission: "查看本组工单", specialist: true, supervisor: true, knowledge: false, admin: true },
  { permission: "调整工单负责人", specialist: false, supervisor: true, knowledge: false, admin: true },
  { permission: "发布知识文章", specialist: false, supervisor: false, knowledge: true, admin: true },
  { permission: "导出客户数据", specialist: false, supervisor: true, knowledge: false, admin: true },
  { permission: "管理角色权限", specialist: false, supervisor: false, knowledge: false, admin: true },
];

export default function TeamPage() {
  const members = getTeamMembers();

  return (
    <div className="space-y-8">
      <PageHeader
        description="查看客服团队负载和角色权限。权限矩阵由业务系统维护，页面只展示生效结果。"
        eyebrow="Team and access"
        title="团队与权限"
      />

      <section>
        <div className="mb-3"><h2 className="text-base font-semibold">团队成员</h2><p className="mt-1 text-sm text-zinc-500">当前在线状态与工单负载</p></div>
        <div className="overflow-x-auto border-y border-zinc-200 bg-white">
          <table className="w-full min-w-[50rem] text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500"><tr><th className="px-4 py-3 font-medium">成员</th><th className="px-4 py-3 font-medium">团队</th><th className="px-4 py-3 font-medium">角色</th><th className="px-4 py-3 font-medium">状态</th><th className="px-4 py-3 font-medium">处理中</th><th className="px-4 py-3 font-medium">今日解决</th></tr></thead>
            <tbody className="divide-y divide-zinc-200">
              {members.map((member) => <tr key={member.id}><td className="px-4 py-3"><p className="font-medium">{member.name}</p><p className="mt-1 text-xs text-zinc-500">{member.id}</p></td><td className="px-4 py-3 text-zinc-600">{member.team}</td><td className="px-4 py-3">{member.role}</td><td className="px-4 py-3"><StatusBadge>{member.status}</StatusBadge></td><td className="px-4 py-3">{member.openTicketCount}</td><td className="px-4 py-3">{member.resolvedToday}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3"><h2 className="text-base font-semibold">角色权限矩阵</h2><p className="mt-1 text-sm text-zinc-500">用于说明当前旧系统的业务访问边界</p></div>
        <div className="overflow-x-auto border-y border-zinc-200 bg-white">
          <table className="w-full min-w-[46rem] text-center text-sm">
            <thead className="bg-zinc-50 text-zinc-500"><tr><th className="px-4 py-3 text-left font-medium">权限</th><th className="px-4 py-3 font-medium">客服专员</th><th className="px-4 py-3 font-medium">客服主管</th><th className="px-4 py-3 font-medium">知识管理员</th><th className="px-4 py-3 font-medium">系统管理员</th></tr></thead>
            <tbody className="divide-y divide-zinc-200">
              {permissionRows.map((row) => <tr key={row.permission}><td className="px-4 py-3 text-left font-medium">{row.permission}</td>{[row.specialist,row.supervisor,row.knowledge,row.admin].map((allowed,index) => <td className={allowed ? "px-4 py-3 text-emerald-700" : "px-4 py-3 text-zinc-300"} key={index}>{allowed ? "允许" : "无权限"}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
