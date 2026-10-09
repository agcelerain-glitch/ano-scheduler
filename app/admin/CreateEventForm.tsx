"use client";

import { useActionState } from "react";
import { createEventAction, type ActionState } from "./actions";

const initial: ActionState = {};

export default function CreateEventForm() {
  const [state, formAction, pending] = useActionState(createEventAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">タイトル</label>
        <input
          name="title"
          required
          maxLength={100}
          placeholder="例: 10月 定例ミーティング"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">説明（任意）</label>
        <textarea
          name="description"
          maxLength={1000}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">開始日</label>
          <input type="date" name="dateStart" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium">終了日</label>
          <input type="date" name="dateEnd" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">開始時刻</label>
          <input type="time" name="timeStart" required defaultValue="09:00" step={1800} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium">終了時刻</label>
          <input type="time" name="timeEnd" required defaultValue="18:00" step={1800} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">スロット間隔</label>
        <select name="slotMinutes" defaultValue="30" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="15">15分</option>
          <option value="30">30分</option>
          <option value="60">60分</option>
        </select>
      </div>

      <input type="hidden" name="timezone" value="Asia/Tokyo" />

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "作成中…" : "イベントを作成"}
      </button>
    </form>
  );
}
