import "server-only";
import { getAdminClient } from "./supabase/admin";
import type { EventTiming } from "./slots";
import type { MemoLite, ParticipantLite, ResponseLite } from "./aggregate";

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
  participants: ParticipantLite[];
  responses: ResponseLite[];
  memos: MemoLite[];
};

/** イベント本体＋回答・メモをまとめて取得。 */
export async function getEventData(id: string): Promise<EventData | null> {
  const event = await getEvent(id);
  if (!event) return null;
  const supabase = getAdminClient();

  const [p, r, m] = await Promise.all([
    supabase
      .from("participants")
      .select("id,name")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("responses")
      .select("participant_id,slot_start,available")
      .eq("event_id", id),
    supabase
      .from("day_memos")
      .select("participant_id,memo_date,memo")
      .eq("event_id", id),
  ]);

  return {
    event,
    participants: (p.data ?? []) as ParticipantLite[],
    responses: (r.data ?? []) as ResponseLite[],
    memos: (m.data ?? []) as MemoLite[],
  };
}

export function isExpired(e: EventRow): boolean {
  return new Date(e.expires_at).getTime() < Date.now();
}
