import { redirect } from "next/navigation";

import {
  getAuthenticationContext,
  isDemoAuthenticationEnabled,
} from "@/features/auth/server/session";

import { signInWithDemoSession } from "./actions";

export default async function LoginPage() {
  const authentication = await getAuthenticationContext();

  if (authentication.status === "authenticated") {
    redirect("/");
  }

  const isConfigurationError =
    authentication.status === "configuration-error";
  const canUseDemoIdentity =
    !isConfigurationError && isDemoAuthenticationEnabled();

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 px-6 py-10 text-zinc-950">
      <section className="w-full max-w-sm border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold">Enterprise AI Workspace</p>
        <h1 className="mt-6 text-xl font-semibold">服务端身份验证</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {canUseDemoIdentity
            ? "使用开发环境演示客服身份进入工作台。"
            : "当前环境未接入可用的企业身份提供方。"}
        </p>

        {canUseDemoIdentity ? (
          <form action={signInWithDemoSession} className="mt-6">
            <button
              className="w-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
              type="submit"
            >
              使用演示身份登录
            </button>
          </form>
        ) : (
          <p className="mt-6 border-l-2 border-amber-500 pl-3 text-sm leading-6 text-amber-800">
            {isConfigurationError
              ? "请配置至少 32 位的 AUTH_SESSION_PASSWORD。"
              : "生产环境需要接入企业 SSO/OIDC 后才能登录。"}
          </p>
        )}
      </section>
    </main>
  );
}
