"use server";

import { redirect } from "next/navigation";

import {
  createDemoUserSession,
  destroyUserSession,
} from "@/features/auth/server/session";

export async function signInWithDemoSession() {
  await createDemoUserSession();
  redirect("/");
}

export async function signOut() {
  await destroyUserSession();
  redirect("/login");
}
