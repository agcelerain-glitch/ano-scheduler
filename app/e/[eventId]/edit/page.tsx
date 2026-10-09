import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEvent, getTakenSlots, isExpired, timingOf } from "@/lib/events";
import { getAdminClient } from "@/lib/supabase/admin";
import { generateSlots, normalizeIso } from "@/lib/slots";
import { hashToken, safeEqual } from "@/lib/tokens";
import { dateLabel } from "@/lib/format";
import AnswerForm from "../AnswerForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "回答の編集",
  robots: { index: false, follow: false },
};

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ p?: string; k?: string }>;
}) {
  const { eventId } = await params;
  const { p: participantId, k: key } = await searchParams;

  const event = await getEvent(eventId);
  if (!event || isExpired(event)) notFound();

  const invalid = (
    <main className="mx-auto max-w-md px-5 py-16 text-center">
      <h1 className="text-xl font-bold">編集用リンクが無効です</h1>
      <p className="mt-2 text-sm text-slate-600">
        URLが正しいか、期限切れでないかご確認ください。
      </p>
      <Link href={`/e/${eventId}`} className="mt-4 inline-block text-sm text-slate-900 underline">
        イベントページへ
      </Link>
    </main>
  );

  if (!participantId || !key) return invalid;

  const supabase = getAdminClient();
  const { data: participant } = await supabase
    .from("participants")
    .select("id,name,event_id,edit_key_hash,note")
    .eq("id", participantId)
    .maybeSingle();

  if (
    !participant ||
    participant.event_id !== eventId ||
    !safeEqual(hashToken(key), participant.edit_key_hash as string)
  ) {
    return invalid;
  }

  if (event.is_closed) {
    return (
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="text-xl font-bold">回答は締め切られています</h1>
        <Link href={`/e/${eventId}`} className="mt-4 inline-block text-sm underline">
          イベントページへ
        </Link>
      </main>
    );
  }

  const { data: resp } = await supabase
    .from("responses")
    .select("slot_start,available")
    .eq("participant_id", participantId);

  const timing = timingOf(event);
  const { dates, times, slots } = generateSlots(timing);
  const columns = dates.map((d) => ({ date: d, label: dateLabel(d) }));
  const slotLookup: Record<string, string> = {};
  for (const s of slots) slotLookup[`${s.date}|${s.time}`] = s.startUtc;

  const initialSelected = (resp ?? [])
    .filter((r) => r.available)
    .map((r) => normalizeIso(r.slot_start as string));

  const allowOverlap = event.allow_overlap !== false;
  // 先着制のときだけ、自分以外が確保済みの枠を選択不可にする
  const takenSlots = allowOverlap
    ? []
    : await getTakenSlots(eventId, participantId);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href={`/e/${eventId}`} className="text-sm text-slate-500 hover:underline">
        ← イベントページへ
      </Link>
      <h1 className="mt-3 text-2xl font-bold">回答の編集：{event.title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {participant.name as string} さんの回答を編集しています。
      </p>

      <div className="mt-8">
        <AnswerForm
          eventId={eventId}
          mode="edit"
          participantId={participantId}
          editKey={key}
          columns={columns}
          times={times}
          slotLookup={slotLookup}
          initialName={participant.name as string}
          initialSelected={initialSelected}
          initialNote={(participant.note as string) ?? ""}
          allowOverlap={allowOverlap}
          takenSlots={takenSlots}
        />
      </div>
    </main>
  );
}
