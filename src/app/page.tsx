import { getTicketSummaries } from "@/data/tickets";
import DetailModal from "./detailModal";

export default async function Home() {
  const environmentLabel =
    process.env.NODE_ENV === "production" ? "生产环境" : "开发环境";
  const tickets = await getTicketSummaries();

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <p className="font-semibold">Enterprise AI Workspace</p>
          <span className="text-sm text-zinc-500">{environmentLabel}</span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">客服工单</h1>
            <p className="mt-2 text-sm text-zinc-600">
              查看当前租户内需要跟进的客户问题。
            </p>
          </div>
          <p className="shrink-0 text-sm text-zinc-500">
            共 {tickets.length} 条
          </p>
        </div>

        <div className="mt-8 overflow-x-auto border-y border-zinc-200 bg-white">
          <table className="w-full min-w-3xl border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">
                  工单编号
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  主题
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  客户
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  状态
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  优先级
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  更新时间
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="whitespace-nowrap px-4 py-4 font-medium">
                      {ticket.id}
                    </td>
                    <td className="px-4 py-4">{ticket.subject}</td>
                    <td className="px-4 py-4">{ticket.customerName}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {ticket.status}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {ticket.priority}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-zinc-500">
                      {ticket.updatedAt}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <DetailModal ticketId={ticket.id} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-12 text-center text-zinc-500"
                    colSpan={7}
                  >
                    尚未接入工单数据源
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
