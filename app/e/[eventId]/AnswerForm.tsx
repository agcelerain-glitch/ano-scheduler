"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ShareLink from "@/components/ShareLink";

export type AnswerFormProps = {
  eventId: string;
  mode: "create" | "edit";
  columns: { date: string; label: string }[];
  times: string[];
  /** `${date}|${time}` -> startUtc(ISO) */
  slotLookup: Record<string, string>;
  initialName?: string;
  initialSelected?: string[];
  initialNote?: string;
  participantId?: string;
  editKey?: string;
  /** false のとき先着制。takenSlots は選択不可。 */
  allowOverlap?: boolean;
  takenSlots?: string[];
};

export default function AnswerForm(props: AnswerFormProps) {
  const router = useRouter();
  const { columns, times, slotLookup } = props;
  const allowOverlap = props.allowOverlap !== false;
  const taken = useMemo(
    () => new Set(props.takenSlots ?? []),
    [props.takenSlots]
  );
  const isBlocked = (start: string | undefined, on: boolean) =>
    !allowOverlap && !!start && !on && taken.has(start);

  const [name, setName] = useState(props.initialName ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(props.initialSelected ?? [])
  );
  const [note, setNote] = useState(props.initialNote ?? "");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ editUrl?: string } | null>(null);

  const slotFor = (date: string, time: string) => slotLookup[`${date}|${time}`];

  function toggle(startUtc: string | undefined) {
    if (!startUtc) return;
    // 先着制で他人が確保済みの枠は選べない
    if (!allowOverlap && !selected.has(startUtc) && taken.has(startUtc)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(startUtc)) next.delete(startUtc);
      else next.add(startUtc);
      return next;
    });
  }

  function toggleColumn(date: string) {
    const starts = times
      .map((t) => slotFor(date, t))
      .filter((s): s is string => Boolean(s))
      // 先着制で確保済みの枠は対象外
      .filter((s) => allowOverlap || selected.has(s) || !taken.has(s));
    const allOn = starts.length > 0 && starts.every((s) => selected.has(s));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of starts) {
        if (allOn) next.delete(s);
        else next.add(s);
      }
      return next;
    });
  }

  const selectedCount = selected.size;

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    setSubmitting(true);
    const payload = {
      name: name.trim(),
      website: honeypot,
      available: Array.from(selected),
      note,
    };
    try {
      const res =
        props.mode === "create"
          ? await fetch(`/api/events/${props.eventId}/responses`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/responses/${props.participantId}`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ...payload, key: props.editKey }),
            });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました");
        setSubmitting(false);
        return;
      }
      if (props.mode === "create") {
        setDone({ editUrl: data.editUrl });
      } else {
        setDone({});
      }
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-medium text-emerald-800">
          {props.mode === "create" ? "回答を送信しました！" : "回答を更新しました！"}
        </p>
        {props.mode === "create" && done.editUrl && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-emerald-900">
              あとから回答を編集するためのリンクです。
              <strong>必ず保存してください（再表示されません）。</strong>
            </p>
            <ShareLink
              url={done.editUrl}
              label="編集用リンク"
              shareTitle="回答の編集リンク（ano-scheduler）"
            />
          </div>
        )}
        <button
          onClick={() => setDone(null)}
          className="mt-4 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm hover:bg-emerald-100"
        >
          続けて編集する
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium">お名前</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="例: 山田"
          className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {/* ハニーポット（人間には不可視・ボット対策） */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0"
      />

      <div>
        <p className="mb-2 text-sm text-slate-600">
          参加できる時間帯をタップして ○ を付けてください（{selectedCount}件 選択中）
        </p>
        <div className="no-select overflow-x-auto rounded-lg border border-slate-200">
          <table className="border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 z-10 bg-slate-100 px-2 py-1.5 text-left">
                  時間
                </th>
                {columns.map((c) => (
                  <th key={c.date} className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleColumn(c.date)}
                      className="whitespace-nowrap font-medium hover:underline"
                      title="この日をまとめて切り替え"
                    >
                      {c.label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((t) => (
                <tr key={t} className="odd:bg-white even:bg-slate-50/50">
                  <td className="sticky left-0 z-10 bg-inherit px-2 py-1 font-mono tabular-nums">
                    {t}
                  </td>
                  {columns.map((c) => {
                    const start = slotFor(c.date, t);
                    const on = start ? selected.has(start) : false;
                    const blocked = isBlocked(start, on);
                    return (
                      <td key={c.date} className="p-0.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(start)}
                          disabled={blocked}
                          className={`h-8 w-12 rounded text-base ${
                            blocked
                              ? "cursor-not-allowed bg-slate-200 text-slate-400"
                              : on
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          {blocked ? "埋" : on ? "○" : "・"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">特記事項（任意）</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="例: 20時以降なら調整可能です など"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {submitting
          ? "送信中…"
          : props.mode === "create"
            ? "回答を送信"
            : "回答を更新"}
      </button>
    </div>
  );
}
