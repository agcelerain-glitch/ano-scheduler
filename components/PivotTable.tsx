import type { Pivot } from "@/lib/aggregate";

/** スロット×参加者のクロス集計表。○数が最大の行をハイライトする。 */
export default function PivotTable({ pivot }: { pivot: Pivot }) {
  const { participants, dates, memos } = pivot;

  if (participants.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        まだ回答がありません。
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {dates.map((d) => {
        const hasMemo = participants.some((p) => memos[p.id]?.[d.date]);
        return (
          <div key={d.date}>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">{d.label}</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
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
            {hasMemo && (
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {participants.map((p) =>
                  memos[p.id]?.[d.date] ? (
                    <li key={p.id}>
                      <span className="font-medium">{p.name}:</span>{" "}
                      {memos[p.id][d.date]}
                    </li>
                  ) : null
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
