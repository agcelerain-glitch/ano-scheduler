import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin, isSuperAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { countUnread } from "@/lib/feedback";
import { dateLabel, daysUntil } from "@/lib/format";
import CreateEventForm from "./CreateEventForm";
import HealthCheckPanel from "@/components/HealthCheckPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "管理",
  robots: { index: false, follow: false },
};

type EventListRow = {
  id: string;
  title: string;
  date_start: string;
  date_end: string;
  is_closed: boolean;
  expires_at: string;
};

export default async function AdminPage() {
  const user = await requireAdmin();
  const supabase = getAdminClient();
  // 最上位（開発者）は全イベント、一般管理者は自分が owner のイベントのみ。
  let query = supabase
    .from("events")
    .select("id,title,date_start,date_end,is_closed,expires_at")
    .order("created_at", { ascending: false });
  if (!isSuperAdmin(user.email)) {
    query = query.eq("owner_email", user.email);
  }
  const { data } = await query;
  const events = (data ?? []) as EventListRow[];
  const unreadFeedback = await countUnread(user.email ?? undefined);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理画面</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/feedback"
            className="relative rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            フィードバック
            {unreadFeedback > 0 && (
              <span className="absolute -right-2 -top-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold text-white">
                {unreadFeedback}
              </span>
            )}
          </Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <section>
          <h2 className="mb-3 text-lg font-semibold">イベント一覧</h2>
          {events.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              まだイベントがありません。右のフォームから作成してください。
            </p>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => {
                const left = daysUntil(e.expires_at);
                return (
                  <li key={e.id}>
                    <Link
                      href={`/admin/events/${e.id}`}
                      className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{e.title}</span>
                        {e.is_closed && (
                          <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                            締切
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {dateLabel(e.date_start)}〜{dateLabel(e.date_end)} ・ あと{left}日で削除
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">新しいイベント</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <CreateEventForm />
            </div>
          </div>
          <HealthCheckPanel />
        </section>
      </div>
    </main>
  );
}
