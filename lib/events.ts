import "server-only";
import { getAdminClient } from "./supabase/admin";
import { normalizeIso, type EventTiming } from "./slots";
import type { ParticipantWithNote, ResponseLite } from "./aggregate";

export type EventRow = {
  id: string;
  title: string;
  description: string;
  owner_email: string;
  date_start: string;
  date_end: string;
  time_start: string;
  time_end: string;
  slot_minutes: number;
  timezone: string;
  is_closed: boolean;
  allow_overlap: boolean;
  created_at: string;
  expires_at: string;
};

/** Postgres の time/date 値から UI 用の EventTiming を得る。 */
export function timingOf(e: EventRow): EventTiming {
  return {
    dateStart: e.date_start,
    dateEnd: e.date_end,
    timeStart: e.time_start.slice(0, 5),
    timeEnd: e.time_end.slice(0, 5),
    slotMinutes: e.slot_minutes,
    timeZone: e.timezone,
  };
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as EventRow;
}

export type EventData = {
  event: EventRow;
  participants: ParticipantWithNote[];
  responses: ResponseLite[];
};

/** イベント本体＋回答（参加者の特記事項含む）をまとめて取得。 */
export async function getEventData(id: string): Promise<EventData | null> {
  const event = await getEvent(id);
  if (!event) return null;
  const supabase = getAdminClient();

  const [p, r] = await Promise.all([
    supabase
      .from("participants")
      .select("id,name,note")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("responses")
      .select("participant_id,slot_start,available")
      .eq("event_id", id),
  ]);

  return {
    event,
    participants: (p.data ?? []) as ParticipantWithNote[],
    responses: (r.data ?? []) as ResponseLite[],
  };
}

export function isExpired(e: EventRow): boolean {
  return new Date(e.expires_at).getTime() < Date.now();
}

/** 既に回答で埋まっているスロット（正規化ISO）。先着制の埋まり判定に使う。 */
export async function getTakenSlots(
  eventId: string,
  excludeParticipantId?: string
): Promise<string[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("responses")
    .select("slot_start,participant_id")
    .eq("event_id", eventId);
  let rows = data ?? [];
  if (excludeParticipantId) {
    rows = rows.filter((r) => r.participant_id !== excludeParticipantId);
  }
  return rows.map((r) => normalizeIso(r.slot_start as string));
}
