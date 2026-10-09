import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerSupabase } from "./supabase/server";

/** ADMIN_EMAILS（カンマ区切り）を正規化して配列で返す。 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = adminEmails();
  return list.length > 0 && list.includes(email.toLowerCase());
}

/** 許可リストに含まれる管理者ユーザーを返す。未ログイン/不許可なら null。 */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return null;
  return user;
}

/** 管理者ページ用。未許可なら /admin/login へリダイレクト。 */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}
