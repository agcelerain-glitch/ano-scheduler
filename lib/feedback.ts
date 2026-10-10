import "server-only";
import { getAdminClient } from "./supabase/admin";
import { isSuperAdmin } from "./auth";

export type FeedbackRow = {
  id: string;
  kind: string;
  message: string;
  target: string;
  contact: string;
  path: string;
  created_at: string;
};

/**
 * 指定した管理者が閲覧できるフィードバック行を取得する。
 * - 最上位（開発者）: 全件（システムフィードバック＋参加リクエスト）。
 * - 一般管理者: 自分が owner のイベント(/e/{id})由来のシステムフィードバックのみ。
 *   参加リクエスト（送信元はトップ）はサービス全体向けなので表示しない。
 */
export async function listVisibleFeedback(
  email: string | undefined,
  limit = 100
): Promise<FeedbackRow[]> {
  if (!email) return [];
  const supabase = getAdminClient();

  if (isSuperAdmin(email)) {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as FeedbackRow[];
  }

  const { data: myEvents } = await supabase
    .from("events")
    .select("id")
    .eq("owner_email", email);
  const ids = (myEvents ?? []).map((e) => e.id as string);
  if (ids.length === 0) return [];

  // path が "/e/{id}" で始まるもの（/e/{id}, /e/{id}/edit 等）を前方一致で絞る。
  const orFilter = ids.map((id) => `path.like./e/${id}*`).join(",");
  const { data } = await supabase
    .from("feedback")
    .select("*")
    .eq("kind", "feedback")
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as FeedbackRow[];
}

/**
 * 指定した管理者が既読済みの feedback_id 集合を返す。
 * feedback_reads が未適用でも落ちないよう、失敗時は空集合。
 */
export async function getReadIds(
  email: string,
  feedbackIds: string[]
): Promise<Set<string>> {
  if (feedbackIds.length === 0) return new Set();
  const { data } = await getAdminClient()
    .from("feedback_reads")
    .select("feedback_id")
    .eq("email", email.toLowerCase())
    .in("feedback_id", feedbackIds);
  return new Set((data ?? []).map((r) => r.feedback_id as string));
}

/** 指定した管理者にとっての未読件数（表示対象の範囲内）。 */
export async function countUnread(email: string | undefined): Promise<number> {
  if (!email) return 0;
  // バッジ用途なので表示上限より広めに拾う。
  const rows = await listVisibleFeedback(email, 500);
  if (rows.length === 0) return 0;
  const readIds = await getReadIds(
    email,
    rows.map((r) => r.id)
  );
  return rows.filter((r) => !readIds.has(r.id)).length;
}
