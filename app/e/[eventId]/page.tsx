import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getEvent,
  getResponses,
  getTakenSlots,
  isExpired,
  timingOf,
} from "@/lib/events";
import { generateSlots } from "@/lib/slots";
import { buildPivot, type Pivot } from "@/lib/aggregate";
import { dateLabel } from "@/lib/format";
import PivotTable from "@/components/PivotTable";
import AnswerForm from "./AnswerForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  return {
    title: event ? event.title : "日程調整",
    robots: { index: false, follow: false },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event || isExpired(event)) notFound();

  const timing = timingOf(event);
  const { dates, times, slots } = generateSlots(timing);

  const columns = dates.map((d) => ({ date: d, label: dateLabel(d) }));
  const slotLookup: Record<string, string> = {};
  for (const s of slots) slotLookup[`${s.date}|${s.time}`] = s.startUtc;

  const allowOverlap = event.allow_overlap !== false;
  // 重複OK: 全体の投票結果を参加者にも公開（名前付きピボット）。
  // 先着制: 埋まっている枠だけ取得して選択不可にし、集計は非公開。
  let pivot: Pivot | null = null;
  let takenSlots: string[] = [];
  if (allowOverlap) {
    const { participants, responses } = await getResponses(event.id);
    pivot = buildPivot(timing, participants, responses);
  } else {
    takenSlots = await getTakenSlots(event.id);
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {dateLabel(event.date_start)}〜{dateLabel(event.date_end)}{" "}
          {event.time_start.slice(0, 5)}–{event.time_end.slice(0, 5)}
        </p>
        {event.description && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-slate-700">
            {event.description}
          </p>
        )}
      </header>

      <section className="mt-8">
        {event.is_closed ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            この日程調整は回答が締め切られました。
          </p>
        ) : (
          <>
            <h2 className="mb-1 text-lg font-semibold">回答する</h2>
            <p className="mb-3 text-xs text-slate-500">
              {allowOverlap
                ? "参加できる時間帯に印をつけてください。"
                : "空いている枠を確保できます（先着順）。「埋」は確保済みです。"}
            </p>
            <AnswerForm
              eventId={event.id}
              mode="create"
              columns={columns}
              times={times}
              slotLookup={slotLookup}
              allowOverlap={allowOverlap}
              takenSlots={takenSlots}
            />
          </>
        )}
      </section>

      {/* 重複OKのときだけ、全体の投票結果を開閉式で公開 */}
      {allowOverlap && pivot && (
        <section className="mt-8">
          <details className="group rounded-xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
              <span className="text-lg font-semibold">全体の投票結果を見る</span>
              <span className="flex items-center gap-2 text-xs text-slate-500">
                {pivot.participants.length}人回答
                <span className="transition-transform group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>
            <div className="border-t border-slate-100 p-4">
              <PivotTable pivot={pivot} />
            </div>
          </details>
        </section>
      )}

      <p className="mt-8 text-xs text-slate-400">
        {allowOverlap
          ? "このイベントは重複OKのため、全体の投票結果を参加者も上のボタンから閲覧できます。"
          : "回答は主催者のみが確認できます。"}
        修正は送信後に表示される「編集用URL」から行えます。
        このイベントは作成から30日で自動的に削除されます。
      </p>
    </main>
  );
}
