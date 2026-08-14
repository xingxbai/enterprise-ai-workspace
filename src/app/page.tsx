import { getTicketSummaries } from "@/data/tickets";
import { getChatProvidersStatus } from "@/features/ai/server/chatProvider";
import { requireAuthenticatedUser } from "@/features/auth/server/session";
import ApproveButton from "./approveButton";
import DetailModal from "./detailModal";
import ReplySuggestionChatPanel from "./replySuggestionChatPanel";
import { signOut } from "./login/actions";

export default async function Home() {
  const currentUser = await requireAuthenticatedUser();
  const environmentLabel =
    process.env.NODE_ENV === "production" ? "生产环境" : "开发环境";
  const providerStatus = getChatProvidersStatus();
  const activeProvider = providerStatus.providers.find(
    (provider) => provider.isActive,
  );
  const tickets = await getTicketSummaries();

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <p className="font-semibold">Enterprise AI Workspace</p>
          <div className="flex items-center gap-3 text-sm">
            <span className="whitespace-nowrap text-zinc-600">
              {currentUser.displayName}
            </span>
            <span className="hidden text-zinc-400 sm:inline">
              {environmentLabel}
            </span>
            <form action={signOut}>
              <button
                className="text-zinc-600 hover:text-zinc-950"
                type="submit"
              >
                退出
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">客服工单</h1>
            <p className="mt-2 text-sm text-zinc-600">
              查看需要跟进的客户问题；开发环境可以使用明确标注的演示数据。
            </p>
          </div>
          <p className="shrink-0 text-sm text-zinc-500">
            共 {tickets.length} 条
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">模型服务状态</p>
              <p className="mt-1 text-xs text-zinc-500">
                当前由服务端 Provider Adapter 选择模型，前端不接触密钥、baseURL 或完整 Prompt。
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
              当前：{activeProvider?.label ?? "未识别"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {providerStatus.providers.map((provider) => (
              <div
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm"
                key={provider.providerId}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{provider.label}</p>
                  <span
                    className={
                      provider.isConfigured
                        ? "text-xs text-emerald-700"
                        : "text-xs text-amber-700"
                    }
                  >
                    {provider.isConfigured ? "已配置" : "未配置"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {provider.modelId} · {provider.baseURLHost}
                </p>
              </div>
            ))}
          </div>
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
                      <div className="flex items-center gap-4">
                        <DetailModal ticketId={ticket.id} />
                        <ApproveButton ticketId={ticket.id} />
                        <ReplySuggestionChatPanel ticketId={ticket.id} />
                      </div>
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
