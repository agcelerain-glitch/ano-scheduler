import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerSupabase } from "./supabase/server";

/**
 * 権限は2階層。
 * - 一般管理者（ADMIN_EMAILS）: 自分が作成したイベントとその集計・自分のイベント由来の
 *   システムフィードバックだけを閲覧／操作できる（テナント分離）。
 * - 最上位＝開発者（SUPER_ADMIN_EMAILS）: 全イベント・全フィードバックを総括できる。
 * どちらもカンマ区切り。両方に同じメールが入っていても、権限は「和」で評価され
 * SUPER が優先されるため矛盾しない（= 開発者は常に全体を見られる）。
 */
function parseEmails(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** ADMIN_EMAILS（カンマ区切り）を正規化して配列で返す。 */
export function adminEmails(): string[] {
  return parseEmails(process.env.ADMIN_EMAILS);
}

/** SUPER_ADMIN_EMAILS（最上位＝開発者）を正規化して配列で返す。 */
export function superAdminEmails(): string[] {
  return parseEmails(process.env.SUPER_ADMIN_EMAILS);
}

/** 最上位（開発者）か。全イベント・全フィードバックを総括できる。 */
export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return superAdminEmails().includes(email.toLowerCase());
}

/** /admin にアクセスできるか（一般管理者 ∪ 最上位の和集合）。 */
export function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return adminEmails().includes(normalized) || superAdminEmails().includes(normalized);
}

/**
 * 対象イベントを閲覧／操作できるか。
 * 最上位は常に可。一般管理者は自分が owner のイベントのみ可。
 */
export function canManageEvent(
  user: Pick<User, "email">,
  ownerEmail: string | null | undefined
): boolean {
  if (isSuperAdmin(user.email)) return true;
  if (!user.email || !ownerEmail) return false;
  return ownerEmail.toLowerCase() === user.email.toLowerCase();
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
