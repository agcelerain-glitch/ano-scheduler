import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventData, isExpired, timingOf } from "@/lib/events";
import { buildPivot } from "@/lib/aggregate";
import { generateSlots } from "@/lib/slots";
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
  const data = await getEventData(eventId);
  return {
    title: data ? data.event.title : "日程調整",
    robots: { index: false, follow: false },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const data = await getEventData(eventId);
  if (!data || isExpired(data.event)) notFound();

  const { event, participants, responses, memos } = data;
  const timing = timingOf(event);
  const { dates, times, slots } = generateSlots(timing);

  const columns = dates.map((d) => ({ date: d, label: dateLabel(d) }));
  const slotLookup: Record<string, string> = {};
  for (const s of slots) slotLookup[`${s.date}|${s.time}`] = s.startUtc;

  const pivot = buildPivot(timing, participants, responses, memos);

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
            <h2 className="mb-3 text-lg font-semibold">回答する</h2>
            <AnswerForm
              eventId={event.id}
              mode="create"
              columns={columns}
              times={times}
              slotLookup={slotLookup}
            />
          </>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">
          みんなの回答（{participants.length}人）
        </h2>
        <PivotTable pivot={pivot} />
      </section>

      <p className="mt-8 text-xs text-slate-400">
        回答の修正は、送信後に表示される「編集用URL」から行えます。
        このイベントは作成から30日で自動的に削除されます。
      </p>
    </main>
  );
}
