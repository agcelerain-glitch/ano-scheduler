import { generateSlots, normalizeIso, type EventTiming } from "./slots";
import { dateLabel } from "./format";

export type ParticipantLite = { id: string; name: string };
export type ParticipantWithNote = { id: string; name: string; note: string };
export type ResponseLite = {
  participant_id: string;
  slot_start: string;
  available: boolean;
};

export type PivotRow = {
  time: string;
  startUtc: string;
  okCount: number;
  isBest: boolean;
  /** participantId -> ○かどうか */
  cells: Record<string, boolean>;
};

export type PivotDate = {
  date: string;
  label: string;
  rows: PivotRow[];
  maxOkInDate: number;
};

export type PivotNote = { id: string; name: string; note: string };

export type Pivot = {
  participants: ParticipantLite[];
  times: string[];
  dates: PivotDate[];
  notes: PivotNote[];
  maxOk: number;
};

export function buildPivot(
  timing: EventTiming,
  participants: ParticipantWithNote[],
  responses: ResponseLite[]
): Pivot {
  const { dates, times, slots } = generateSlots(timing);

  // slot(正規化ISO) -> Set<participantId>（○の人）
  const okBySlot = new Map<string, Set<string>>();
  for (const r of responses) {
    if (!r.available) continue;
    const key = normalizeIso(r.slot_start);
    let set = okBySlot.get(key);
    if (!set) {
      set = new Set();
      okBySlot.set(key, set);
    }
    set.add(r.participant_id);
  }

  // slot(date|time) -> startUtc
  const startBy = new Map<string, string>();
  for (const s of slots) startBy.set(`${s.date}|${s.time}`, s.startUtc);

  const cols: ParticipantLite[] = participants.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  let maxOk = 0;
  const rowsByDate = new Map<string, PivotRow[]>();
  const maxByDate = new Map<string, number>();
  for (const date of dates) {
    const rows: PivotRow[] = [];
    let dateMax = 0;
    for (const time of times) {
      const startUtc = startBy.get(`${date}|${time}`)!;
      const okSet = okBySlot.get(startUtc) ?? new Set<string>();
      const cells: Record<string, boolean> = {};
      for (const p of cols) cells[p.id] = okSet.has(p.id);
      const okCount = okSet.size;
      if (okCount > maxOk) maxOk = okCount;
      if (okCount > dateMax) dateMax = okCount;
      rows.push({ time, startUtc, okCount, isBest: false, cells });
    }
    rowsByDate.set(date, rows);
    maxByDate.set(date, dateMax);
  }

  const pivotDates: PivotDate[] = dates.map((date) => {
    const rows = rowsByDate.get(date)!;
    for (const row of rows) {
      row.isBest = maxOk > 0 && row.okCount === maxOk;
    }
    return {
      date,
      label: dateLabel(date),
      rows,
      maxOkInDate: maxByDate.get(date) ?? 0,
    };
  });

  const notes: PivotNote[] = participants
    .filter((p) => p.note && p.note.trim() !== "")
    .map((p) => ({ id: p.id, name: p.name, note: p.note }));

  return { participants: cols, times, dates: pivotDates, notes, maxOk };
}
