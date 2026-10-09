import { generateSlots, normalizeIso, type EventTiming } from "./slots";
import { dateLabel } from "./format";

export type ParticipantLite = { id: string; name: string };
export type ResponseLite = {
  participant_id: string;
  slot_start: string;
  available: boolean;
};
export type MemoLite = {
  participant_id: string;
  memo_date: string;
  memo: string;
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
};

export type Pivot = {
  participants: ParticipantLite[];
  times: string[];
  dates: PivotDate[];
  /** participantId -> (date -> memo) */
  memos: Record<string, Record<string, string>>;
  maxOk: number;
};

export function buildPivot(
  timing: EventTiming,
  participants: ParticipantLite[],
  responses: ResponseLite[],
  memos: MemoLite[]
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

  // メモ: participantId -> date -> memo
  const memoMap: Record<string, Record<string, string>> = {};
  for (const m of memos) {
    (memoMap[m.participant_id] ??= {})[m.memo_date] = m.memo;
  }

  // slot(date|time) -> startUtc
  const startBy = new Map<string, string>();
  for (const s of slots) startBy.set(`${s.date}|${s.time}`, s.startUtc);

  // まず全行を作りつつ最大○数を求める
  let maxOk = 0;
  const rowsByDate = new Map<string, PivotRow[]>();
  for (const date of dates) {
    const rows: PivotRow[] = [];
    for (const time of times) {
      const startUtc = startBy.get(`${date}|${time}`)!;
      const okSet = okBySlot.get(startUtc) ?? new Set<string>();
      const cells: Record<string, boolean> = {};
      for (const p of participants) cells[p.id] = okSet.has(p.id);
      const okCount = okSet.size;
      if (okCount > maxOk) maxOk = okCount;
      rows.push({ time, startUtc, okCount, isBest: false, cells });
    }
    rowsByDate.set(date, rows);
  }

  // 最大○数に並ぶ行をベスト候補としてマーク（1人以上いる場合のみ）
  const pivotDates: PivotDate[] = dates.map((date) => {
    const rows = rowsByDate.get(date)!;
    for (const row of rows) {
      row.isBest = maxOk > 0 && row.okCount === maxOk;
    }
    return { date, label: dateLabel(date), rows };
  });

  return {
    participants,
    times,
    dates: pivotDates,
    memos: memoMap,
    maxOk,
  };
}
