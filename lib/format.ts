const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-10-10" -> "10/10(金)" */
export function dateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}/${d}(${WEEKDAYS[wd]})`;
}

/** 保持期限までの残り日数（切り上げ）。 */
export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}
