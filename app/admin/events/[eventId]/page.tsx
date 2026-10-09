import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getEventData, timingOf } from "@/lib/events";
import { buildPivot } from "@/lib/aggregate";
import { getBaseUrl } from "@/lib/base-url";
import { dateLabel, daysUntil } from "@/lib/format";
import PivotTable from "@/components/PivotTable";
import CopyField from "@/components/CopyField";
import ConfirmButton from "@/components/ConfirmButton";
import EditEventForm from "./EditEventForm";
import {
  deleteEventAction,
  toggleCloseAction,
  deleteParticipantAction,
} from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "イベント管理",
  robots: { index: false, follow: false },
};

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireAdmin();
  const { eventId } = await params;
  const data = await getEventData(eventId);
  if (!data) notFound();

  const { event, participants, responses } = data;
  const pivot = buildPivot(timingOf(event), participants, responses);
  const h = await headers();
  const answerUrl = `${getBaseUrl(h)}/e/${event.id}`;
  const allowOverlap = event.allow_overlap !== false;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:underline">
        ← 一覧へ戻る
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {dateLabel(event.date_start)}〜{dateLabel(event.date_end)}{" "}
            {event.time_start.slice(0, 5)}–{event.time_end.slice(0, 5)}（
            {event.slot_minutes}分刻み / {event.timezone}）
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {allowOverlap ? "複数人で調整（重複OK）" : "先着1名（重複NG・予約型）"}
            {" ・ "}作成から30日で自動削除 ・ 残り{daysUntil(event.expires_at)}日
          </p>
        </div>
        {event.is_closed && (
          <span className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-600">
            締切中
          </span>
        )}
      </header>

      {/* タイトル・説明の編集 */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">タイトル・説明の編集</h2>
        <EditEventForm
          eventId={event.id}
          title={event.title}
          description={event.description}
        />
      </section>

      {/* URL配布 */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">URLを配布</h2>
        <CopyField label="回答用URL（参加者へ共有）" value={answerUrl} />
        <p className="mt-2 text-xs text-slate-400">
          {allowOverlap
            ? "重複OKのため、参加者も回答ページで全体の投票結果（名前付き）を閲覧できます。CSV出力は管理者のみ可能です。"
            : "参加者は回答のみ行えます。集計（下記ピボット表）はこの管理画面でのみ閲覧できます。"}
        </p>
      </section>

      {/* 回答状況 */}
      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">集計（{participants.length}人回答）</h2>
          <div className="flex items-center gap-2">
            <a
              href={`/admin/events/${event.id}/export`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              CSV出力
            </a>
            <form action={toggleCloseAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="close" value={(!event.is_closed).toString()} />
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
                {event.is_closed ? "回答受付を再開" : "回答を締め切る"}
              </button>
            </form>
          </div>
        </div>
        <PivotTable pivot={pivot} />
      </section>

      {/* 参加者管理 */}
      {participants.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">参加者の管理</h2>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-2">
                <span className="text-sm">{p.name}</span>
                <form action={deleteParticipantAction}>
                  <input type="hidden" name="participantId" value={p.id} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <ConfirmButton
                    message={`「${p.name}」の回答を削除しますか？`}
                    className="text-xs text-red-600 hover:underline"
                  >
                    削除
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 危険操作 */}
      <section className="mt-10 rounded-xl border border-red-200 bg-red-50 p-5">
        <h2 className="text-sm font-semibold text-red-700">イベントの削除</h2>
        <p className="mt-1 text-xs text-red-600">
          回答・メモもすべて削除されます。この操作は取り消せません。
        </p>
        <form action={deleteEventAction} className="mt-3">
          <input type="hidden" name="eventId" value={event.id} />
          <ConfirmButton
            message="このイベントを完全に削除しますか？（取り消せません）"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            イベントを削除
          </ConfirmButton>
        </form>
      </section>
    </main>
  );
}
