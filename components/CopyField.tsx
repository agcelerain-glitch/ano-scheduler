"use client";

import { useState } from "react";

export default function CopyField({
  label,
  value,
  openUrl = false,
}: {
  label: string;
  value: string;
  /** true のとき値をURLとみなし「新しいタブで開く」ボタンを表示する */
  openUrl?: boolean;
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
      {/* スマホ(既定)は縦積みでコピーボタンを入力欄の下に、sm以上は横並び */}
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:flex-1"
        />
        <button
          type="button"
          onClick={copy}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 sm:shrink-0"
        >
          {copied ? "コピー済" : "コピー"}
        </button>
        {openUrl && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 sm:shrink-0"
          >
            新しいタブで開く
          </a>
        )}
      </div>
    </div>
  );
}
