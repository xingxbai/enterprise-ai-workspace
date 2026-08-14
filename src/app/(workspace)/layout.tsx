import type { ReactNode } from "react";

import WorkspaceShell from "@/components/workspace/workspaceShell";
import { requireAuthenticatedUser } from "@/features/auth/server/session";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentUser = await requireAuthenticatedUser();

  return <WorkspaceShell user={currentUser}>{children}</WorkspaceShell>;
}
