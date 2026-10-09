"use client";

import { useActionState } from "react";
import { updateEventAction, type ActionState } from "../../actions";

const initial: ActionState = {};

export default function EditEventForm({
  eventId,
  title,
  description,
}: {
  eventId: string;
  title: string;
  description: string;
}) {
  const [state, formAction, pending] = useActionState(updateEventAction, initial);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <label className="block text-sm font-medium">タイトル</label>
        <input
          name="title"
          defaultValue={title}
          required
          maxLength={100}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">説明</label>
        <textarea
          name="description"
          defaultValue={description}
          maxLength={1000}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? "保存中…" : "変更を保存"}
        </button>
        {state.ok && <span className="text-sm text-emerald-600">保存しました</span>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
