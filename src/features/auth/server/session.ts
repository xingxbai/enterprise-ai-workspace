import "server-only";

import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { createApiErrorResponse } from "@/features/http/server/apiResponse";

const SESSION_COOKIE_NAME = "enterprise-ai-workspace.session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const DEVELOPMENT_SESSION_PASSWORD =
  "development-only-enterprise-ai-workspace-session-password";
const DEMO_USER_ID = "USER-DEMO-CS-001";

const sessionPayloadSchema = z
  .object({
    authenticatedAt: z.string().datetime(),
    userId: z.string().trim().min(1),
  })
  .strict();

type SessionData = {
  authenticatedAt?: string;
  userId?: string;
};

export type AuthenticatedUser = {
  displayName: string;
  id: string;
};

export type AuthenticationContext =
  | { status: "authenticated"; user: AuthenticatedUser }
  | { status: "configuration-error" }
  | { status: "unauthenticated" };

export function isDemoAuthenticationEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_DEMO_AUTH !== "false"
  );
}

function getSessionOptions(): SessionOptions | null {
  const configuredPassword = process.env.AUTH_SESSION_PASSWORD?.trim();

  if (configuredPassword && configuredPassword.length < 32) {
    return null;
  }

  const password =
    configuredPassword ||
    (isDemoAuthenticationEnabled() ? DEVELOPMENT_SESSION_PASSWORD : null);

  if (!password) {
    return null;
  }

  return {
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    password,
    ttl: SESSION_TTL_SECONDS,
  };
}

async function getSession() {
  const options = getSessionOptions();

  if (!options) {
    return null;
  }

  return getIronSession<SessionData>(await cookies(), options);
}

function resolveUserIdentity(userId: string): AuthenticatedUser | null {
  // 企业重点：当前仅提供非生产演示身份；生产环境必须改接企业IdP和用户目录。
  if (!isDemoAuthenticationEnabled() || userId !== DEMO_USER_ID) {
    return null;
  }

  return {
    displayName: "演示客服",
    id: DEMO_USER_ID,
  };
}

export const getAuthenticationContext = cache(
  async (): Promise<AuthenticationContext> => {
    const session = await getSession();

    if (!session) {
      return { status: "configuration-error" };
    }

    const payload = sessionPayloadSchema.safeParse({
      authenticatedAt: session.authenticatedAt,
      userId: session.userId,
    });

    if (!payload.success) {
      return { status: "unauthenticated" };
    }

    const user = resolveUserIdentity(payload.data.userId);

    return user
      ? { status: "authenticated", user }
      : { status: "unauthenticated" };
  },
);

export async function requireAuthenticatedUser() {
  const authentication = await getAuthenticationContext();

  if (authentication.status !== "authenticated") {
    redirect("/login");
  }

  return authentication.user;
}

export async function authenticateApiRequest(requestId: string) {
  const authentication = await getAuthenticationContext();

  if (authentication.status === "authenticated") {
    return { ok: true as const, user: authentication.user };
  }

  const isConfigurationError =
    authentication.status === "configuration-error";

  return {
    ok: false as const,
    response: createApiErrorResponse({
      code: isConfigurationError
        ? "AUTHENTICATION_CONFIGURATION_ERROR"
        : "AUTHENTICATION_REQUIRED",
      message: isConfigurationError
        ? "身份服务未正确配置，请联系管理员"
        : "登录状态已失效，请重新登录",
      requestId,
      status: isConfigurationError ? 503 : 401,
    }),
  };
}

export async function createDemoUserSession() {
  if (!isDemoAuthenticationEnabled()) {
    throw new Error("Demo authentication is disabled");
  }

  const session = await getSession();

  if (!session) {
    throw new Error("Session configuration is invalid");
  }

  // 企业重点：Cookie只保存最小、稳定身份字段，不保存角色、租户或个人敏感信息。
  session.authenticatedAt = new Date().toISOString();
  session.userId = DEMO_USER_ID;
  await session.save();
}

export async function destroyUserSession() {
  const session = await getSession();
  session?.destroy();
}
