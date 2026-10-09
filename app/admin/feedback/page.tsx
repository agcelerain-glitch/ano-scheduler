import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "フィードバック",
  robots: { index: false, follow: false },
};

type FeedbackRow = {
  id: string;
  kind: string;
  message: string;
  target: string;
  contact: string;
  path: string;
  created_at: string;
};

function fmt(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(iso));
}

export default async function AdminFeedbackPage() {
  await requireAdmin();
  const { data } = await getAdminClient()
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as FeedbackRow[];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:underline">
        ← 一覧へ戻る
      </Link>
      <h1 className="mt-3 text-2xl font-bold">フィードバック / リクエスト</h1>
      <p className="mt-1 text-sm text-slate-500">最新100件を表示しています。</p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          まだ届いていません。
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => {
            const isAccess = r.kind === "access_request";
            return (
              <li
                key={r.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      isAccess
                        ? "bg-amber-100 text-amber-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {isAccess ? "🙋 投票権リクエスト" : "📝 フィードバック"}
                  </span>
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
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  {r.contact && <span>連絡先: {r.contact}</span>}
                  {r.path && <span>送信元: {r.path}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
