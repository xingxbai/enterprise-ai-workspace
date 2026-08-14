import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { signOut } from "@/app/login/actions";
import type { AuthenticatedUser } from "@/features/auth/server/session";

import AppNav from "./appNav";

export default function WorkspaceShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AuthenticatedUser;
}) {
  const environmentLabel =
    process.env.NODE_ENV === "production" ? "生产环境" : "演示环境";

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-zinc-200 bg-white lg:flex lg:min-h-screen lg:flex-col">
        <div className="border-b border-zinc-200 px-5 py-5">
          <p className="text-sm font-semibold">Enterprise Service Desk</p>
          <p className="mt-1 text-xs text-zinc-500">客户服务运营工作台</p>
        </div>
        <div className="flex-1 px-3 py-4">
          <AppNav />
        </div>
        <div className="border-t border-zinc-200 p-4">
          <p className="text-sm font-medium">{user.displayName}</p>
          <p className="mt-1 text-xs text-zinc-500">一线支持组 · {environmentLabel}</p>
          <form action={signOut} className="mt-3">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              type="submit"
            >
              <LogOut aria-hidden="true" className="size-4" />
              退出登录
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-zinc-200 bg-white lg:hidden">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
            <div>
              <p className="text-sm font-semibold">Enterprise Service Desk</p>
              <p className="text-xs text-zinc-500">{user.displayName}</p>
            </div>
            <form action={signOut}>
              <button
                aria-label="退出登录"
                className="grid size-9 place-items-center rounded-md text-zinc-600 hover:bg-zinc-100"
                title="退出登录"
                type="submit"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </form>
          </div>
          <div className="overflow-x-auto border-t border-zinc-100 py-2">
            <AppNav mobile />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
