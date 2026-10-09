import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getEvent, isExpired, timingOf } from "@/lib/events";
import { editResponseSchema } from "@/lib/validation";
import { eachDate, normalizeIso, validSlotSet } from "@/lib/slots";
import { hashToken, safeEqual } from "@/lib/tokens";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ participantId: string }> }
) {
  const { participantId } = await context.params;
  const ip = clientIp(request);

  const rl = await checkRateLimit(`edit:${ip}`, [
    { name: "edit-burst", limit: 5, window: "30 s" },
    { name: "edit-hour", limit: 30, window: "1 h" },
  ]);
  if (!rl.success) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらく待ってから再度お試しください。" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const parsed = editResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力エラー" },
      { status: 400 }
    );
  }
  const input = parsed.data;
  if (input.website) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data: participant } = await supabase
    .from("participants")
    .select("id,event_id,edit_key_hash")
    .eq("id", participantId)
    .maybeSingle();

  if (
    !participant ||
    !safeEqual(hashToken(input.key), participant.edit_key_hash as string)
  ) {
    return NextResponse.json({ error: "編集権限がありません" }, { status: 403 });
  }

  const eventId = participant.event_id as string;
  const event = await getEvent(eventId);
  if (!event || isExpired(event)) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }
  if (event.is_closed) {
    return NextResponse.json({ error: "回答は締め切られています" }, { status: 409 });
  }

  const timing = timingOf(event);
  const valid = validSlotSet(timing);
  const validDates = new Set(eachDate(timing.dateStart, timing.dateEnd));
  const available = Array.from(new Set(input.available.map(normalizeIso))).filter(
    (s) => valid.has(s)
  );

  // 既存を入れ替え（この参加者の行のみ操作するため競合は限定的）
  await supabase.from("responses").delete().eq("participant_id", participantId);
  if (available.length > 0) {
    await supabase.from("responses").insert(
      available.map((slot_start) => ({
        event_id: eventId,
        participant_id: participantId,
        slot_start,
        available: true,
      }))
    );
  }

  await supabase.from("day_memos").delete().eq("participant_id", participantId);
  const memoRows = Object.entries(input.memos)
    .filter(([date, memo]) => memo.trim() !== "" && validDates.has(date))
    .map(([memo_date, memo]) => ({
      event_id: eventId,
      participant_id: participantId,
      memo_date,
      memo: memo.trim(),
    }));
  if (memoRows.length > 0) {
    await supabase.from("day_memos").insert(memoRows);
  }

  await supabase
    .from("participants")
    .update({ name: input.name, updated_at: new Date().toISOString() })
    .eq("id", participantId);

  return NextResponse.json({ ok: true });
}
