import type { EventRow } from "./events";
import type { Pivot } from "./aggregate";

/** CSVフィールドをエスケープ（カンマ・引用符・改行を含む場合は "" で囲む）。 */
function esc(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * ピボット集計をCSV文字列に変換する（管理者のCSV出力専用）。
 * 行＝スロット（日付×時間）、列＝○の数＋参加者。末尾に特記事項を付す。
 * 改行は Excel 互換の CRLF。BOM は呼び出し側（Route Handler）で付与する。
 */
export function buildCsv(event: EventRow, pivot: Pivot): string {
  const lines: string[] = [];

  lines.push(esc(`イベント: ${event.title}`));
  lines.push("");

  const header = ["日付", "時間", "○の数", ...pivot.participants.map((p) => p.name)];
  lines.push(header.map(esc).join(","));

  for (const d of pivot.dates) {
    for (const row of d.rows) {
      const cells: (string | number)[] = [
        d.label,
        row.time,
        row.okCount,
        ...pivot.participants.map((p) => (row.cells[p.id] ? "○" : "")),
      ];
      lines.push(cells.map(esc).join(","));
    }
  }

  if (pivot.notes.length > 0) {
    lines.push("");
    lines.push(esc("特記事項"));
    lines.push([esc("名前"), esc("内容")].join(","));
    for (const n of pivot.notes) {
      lines.push([esc(n.name), esc(n.note)].join(","));
    }
  }

  return lines.join("\r\n");
}
