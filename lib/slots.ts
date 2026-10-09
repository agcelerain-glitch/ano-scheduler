export type EventTiming = {
  dateStart: string; // YYYY-MM-DD（タイムゾーンのローカル日付）
  dateEnd: string; // YYYY-MM-DD
  timeStart: string; // HH:mm
  timeEnd: string; // HH:mm（排他）
  slotMinutes: number;
  timeZone: string; // IANA（例: Asia/Tokyo）
};

export type Slot = { date: string; time: string; startUtc: string };

/** 指定タイムゾーンにおける、ある瞬間の UTC からのオフセット(ms)。 */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
  const asUTC = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour,
    map.minute,
    map.second
  );
  return asUTC - instant.getTime();
}

/** 指定タイムゾーンの壁時計時刻を UTC の Date に変換する（DST も概ね考慮）。 */
export function zonedTimeToUtc(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  timeZone: string
): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const offset = tzOffsetMs(new Date(guess), timeZone);
  return new Date(guess - offset);
}

function parseHm(s: string): [number, number] {
  const [h, m] = s.split(":").map(Number);
  return [h, m];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function eachDate(start: string, end: string): string[] {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  let cur = Date.UTC(sy, sm - 1, sd);
  const last = Date.UTC(ey, em - 1, ed);
  const out: string[] = [];
  while (cur <= last) {
    const dt = new Date(cur);
    out.push(
      `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
    );
    cur += 86_400_000;
  }
  return out;
}

export function eachTime(
  timeStart: string,
  timeEnd: string,
  slotMinutes: number
): string[] {
  const [sh, sm] = parseHm(timeStart);
  const [eh, em] = parseHm(timeEnd);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const out: string[] = [];
  for (let t = startMin; t < endMin; t += slotMinutes) {
    out.push(`${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`);
  }
  return out;
}

export function generateSlots(t: EventTiming): {
  dates: string[];
  times: string[];
  slots: Slot[];
} {
  const dates = eachDate(t.dateStart, t.dateEnd);
  const times = eachTime(t.timeStart, t.timeEnd, t.slotMinutes);
  const slots: Slot[] = [];
  for (const date of dates) {
    const [y, mo, d] = date.split("-").map(Number);
    for (const time of times) {
      const [hh, mm] = parseHm(time);
      const utc = zonedTimeToUtc(y, mo, d, hh, mm, t.timeZone);
      slots.push({ date, time, startUtc: utc.toISOString() });
    }
  }
  return { dates, times, slots };
}

/** 送信されたスロットが正当か検証するための集合（正規化済み ISO）。 */
export function validSlotSet(t: EventTiming): Set<string> {
  return new Set(generateSlots(t).slots.map((s) => s.startUtc));
}

/** ISO 文字列を正規化（DB の timestamptz 表記と比較するため）。 */
export function normalizeIso(iso: string): string {
  return new Date(iso).toISOString();
}

/** スロット総数（候補の肥大化を防ぐバリデーション用）。 */
export function slotCount(t: EventTiming): number {
  return eachDate(t.dateStart, t.dateEnd).length *
    eachTime(t.timeStart, t.timeEnd, t.slotMinutes).length;
}
