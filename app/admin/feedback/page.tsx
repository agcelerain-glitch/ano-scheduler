import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin, isSuperAdmin } from "@/lib/auth";
import { listVisibleFeedback, getReadIds } from "@/lib/feedback";
import { toggleFeedbackReadAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "フィードバック",
  robots: { index: false, follow: false },
};

function fmt(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(iso));
}

export default async function AdminFeedbackPage() {
  const user = await requireAdmin();
  const email = user.email ?? undefined;
  const isSuper = isSuperAdmin(email);

  const rows = await listVisibleFeedback(email);
  const readIds = email
    ? await getReadIds(email, rows.map((r) => r.id))
    : new Set<string>();
  const unreadCount = rows.filter((r) => !readIds.has(r.id)).length;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:underline">
        ← 一覧へ戻る
      </Link>
      <div className="mt-3 flex items-center gap-2">
        <h1 className="text-2xl font-bold">
          {isSuper ? "フィードバック / 参加リクエスト" : "システムフィードバック"}
        </h1>
        {unreadCount > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            未読 {unreadCount}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {isSuper
          ? "全体のシステムフィードバックと参加リクエストの最新100件を表示しています。"
          : "あなたのイベントに寄せられたシステムフィードバックの最新100件を表示しています。"}
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          まだ届いていません。
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => {
            const isAccess = r.kind === "access_request";
            const isRead = readIds.has(r.id);
            return (
              <li
                key={r.id}
                className={`rounded-lg border p-4 ${
                  isRead
                    ? "border-slate-200 bg-slate-50"
                    : "border-slate-300 bg-white shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        isAccess
                          ? "bg-amber-100 text-amber-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {isAccess ? "🙋 参加リクエスト" : "📝 システムフィードバック"}
                    </span>
                    {!isRead && (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        未読
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{fmt(r.created_at)}</span>
                </div>
                {isAccess && r.target && (
                  <p className="mt-2 text-sm">
                    <span className="font-medium">希望する予定:</span> {r.target}
                  </p>
                )}
                {r.message && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {r.message}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {r.contact && <span>連絡先: {r.contact}</span>}
                    {r.path && <span>送信元: {r.path}</span>}
                  </div>
                  <form action={toggleFeedbackReadAction}>
                    <input type="hidden" name="feedbackId" value={r.id} />
                    <input type="hidden" name="read" value={(!isRead).toString()} />
                    <button className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100">
                      {isRead ? "未読に戻す" : "既読にする"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
