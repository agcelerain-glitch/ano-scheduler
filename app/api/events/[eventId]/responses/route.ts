import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getEvent, getTakenSlots, isExpired, timingOf } from "@/lib/events";
import { submitResponseSchema } from "@/lib/validation";
import { normalizeIso, validSlotSet } from "@/lib/slots";
import { generateKey, hashToken } from "@/lib/tokens";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { baseUrlFromHeaders } from "@/lib/base-url";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const ip = clientIp(request);

  const rl = await checkRateLimit(`submit:${ip}`, [
    { name: "submit-burst", limit: 3, window: "30 s" },
    { name: "submit-hour", limit: 15, window: "1 h" },
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

  const parsed = submitResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力エラー" },
      { status: 400 }
    );
  }
  const input = parsed.data;
  if (input.website) {
    // ハニーポット: ボット疑い
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const event = await getEvent(eventId);
  if (!event || isExpired(event)) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }
  if (event.is_closed) {
    return NextResponse.json({ error: "回答は締め切られています" }, { status: 409 });
  }

  const timing = timingOf(event);
  const valid = validSlotSet(timing);

  const available = Array.from(new Set(input.available.map(normalizeIso))).filter(
    (s) => valid.has(s)
  );

  // 先着制: 既に他の人が確保した枠を含むなら拒否
  if (event.allow_overlap === false && available.length > 0) {
    const taken = new Set(await getTakenSlots(eventId));
    if (available.some((s) => taken.has(s))) {
      return NextResponse.json(
        { error: "選択した時間の一部が既に埋まりました。画面を更新して選び直してください。" },
        { status: 409 }
      );
    }
  }

  const supabase = getAdminClient();
  const editKey = generateKey();

  const { data: participant, error: pErr } = await supabase
    .from("participants")
    .insert({
      event_id: eventId,
      name: input.name,
      edit_key_hash: hashToken(editKey),
      note: input.note,
    })
    .select("id")
    .single();

  if (pErr || !participant) {
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
  const participantId = participant.id as string;

  if (available.length > 0) {
    const { error } = await supabase.from("responses").insert(
      available.map((slot_start) => ({
        event_id: eventId,
        participant_id: participantId,
        slot_start,
        available: true,
      }))
    );
    if (error) {
      await supabase.from("participants").delete().eq("id", participantId);
      return NextResponse.json({ error: "回答の保存に失敗しました" }, { status: 500 });
    }
  }

  const editUrl = `${baseUrlFromHeaders(request.headers)}/e/${eventId}/edit?p=${participantId}&k=${editKey}`;
  return NextResponse.json({ participantId, editKey, editUrl }, { status: 201 });
}
