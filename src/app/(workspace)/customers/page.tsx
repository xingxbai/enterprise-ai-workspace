import Link from "next/link";

import EmptyState from "@/components/workspace/emptyState";
import PageHeader from "@/components/workspace/pageHeader";
import StatusBadge from "@/components/workspace/statusBadge";
import { getCustomers } from "@/data/legacySystem";

export default function CustomersPage() {
  const customers = getCustomers();

  return (
    <div className="space-y-6">
      <PageHeader
        description="统一查看客户合同、健康度、负责人和待处理问题。客户健康度当前由运营人员人工维护。"
        eyebrow="Customer operations"
        title="客户管理"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["客户总数", customers.length],
          ["风险客户", customers.filter((customer) => customer.health === "风险").length],
          ["未结工单", customers.reduce((sum, customer) => sum + customer.openTicketCount, 0)],
        ].map(([label, value]) => (
          <div className="rounded-lg border border-zinc-200 bg-white p-4" key={label}>
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {customers.length > 0 ? (
        <div className="overflow-x-auto border-y border-zinc-200 bg-white">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">客户</th>
                <th className="px-4 py-3 font-medium">行业 / 区域</th>
                <th className="px-4 py-3 font-medium">合同版本</th>
                <th className="px-4 py-3 font-medium">健康度</th>
                <th className="px-4 py-3 font-medium">未结工单</th>
                <th className="px-4 py-3 font-medium">客户负责人</th>
                <th className="px-4 py-3 font-medium">最近联系</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {customers.map((customer) => (
                <tr className="hover:bg-zinc-50" key={customer.id}>
                  <td className="px-4 py-3">
                    <Link className="font-medium hover:underline" href={`/customers/${customer.id}`}>{customer.name}</Link>
                    <p className="mt-1 text-xs text-zinc-500">{customer.id} · {customer.primaryContact}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{customer.industry} / {customer.region}</td>
                  <td className="px-4 py-3">{customer.contractTier}</td>
                  <td className="px-4 py-3"><StatusBadge>{customer.health}</StatusBadge></td>
                  <td className="px-4 py-3">{customer.openTicketCount}</td>
                  <td className="px-4 py-3 text-zinc-600">{customer.owner}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{customer.lastContactAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="尚未接入客户数据源" />
      )}
    </div>
  );
}
