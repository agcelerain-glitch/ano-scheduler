"use client";

import { useState } from "react";

export default function CopyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* クリップボード不可環境では手動選択で対応 */
    }
  }

  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 flex gap-2">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
        >
          {copied ? "コピー済" : "コピー"}
        </button>
      </div>
    </div>
  );
}
