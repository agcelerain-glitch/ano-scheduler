import type { Pivot } from "@/lib/aggregate";

/**
 * スロット×参加者のクロス集計表（管理者のみ閲覧）。
 * 日付ごとにアコーディオン（details）で折りたたみ、縦長を防ぐ。
 * ○数が最大の行をハイライトする。
 */
export default function PivotTable({ pivot }: { pivot: Pivot }) {
  const { participants, dates, notes } = pivot;

  if (participants.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        まだ回答がありません。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {dates.map((d, i) => (
        <details
          key={d.date}
          open={i === 0}
          className="group rounded-lg border border-slate-200 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5">
            <span className="font-semibold text-slate-700">{d.label}</span>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              最多○ {d.maxOkInDate}人
              <span className="transition-transform group-open:rotate-180">▾</span>
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-2 py-1.5 text-left font-medium">時間</th>
                  <th className="px-2 py-1.5 text-center font-medium">○</th>
                  {participants.map((p) => (
                    <th
                      key={p.id}
                      className="whitespace-nowrap px-2 py-1.5 text-center font-medium"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.rows.map((row) => (
                  <tr
                    key={row.startUtc}
                    className={
                      row.isBest
                        ? "bg-emerald-50"
                        : "odd:bg-white even:bg-slate-50/50"
                    }
                  >
                    <td className="px-2 py-1 font-mono tabular-nums">{row.time}</td>
                    <td
                      className={`px-2 py-1 text-center font-semibold tabular-nums ${
                        row.isBest ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      {row.okCount}
                    </td>
                    {participants.map((p) => (
                      <td key={p.id} className="px-2 py-1 text-center">
                        {row.cells[p.id] ? (
                          <span className="text-emerald-600">○</span>
                        ) : (
                          <span className="text-slate-300">·</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}

      {notes.length > 0 && (
        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5">
            <span className="font-semibold text-slate-700">
              特記事項（{notes.length}件）
            </span>
            <span className="transition-transform group-open:rotate-180 text-xs text-slate-500">
              ▾
            </span>
          </summary>
          <ul className="space-y-2 border-t border-slate-100 p-4 text-sm text-slate-700">
            {notes.map((n) => (
              <li key={n.id}>
                <span className="font-medium">{n.name}:</span>{" "}
                <span className="whitespace-pre-wrap">{n.note}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
