"use client";

import { useEffect, useState } from "react";

export default function ShareLink({
  url,
  label,
  shareTitle,
}: {
  url: string;
  label?: string;
  shareTitle?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* クリップボード不可環境は手動選択 */
    }
  }

  async function share() {
    try {
      await navigator.share({ title: shareTitle ?? "ano-scheduler", url });
    } catch {
      /* ユーザーがキャンセル等 */
    }
  }

  return (
    <div>
      {label && <div className="text-xs font-medium text-slate-500">{label}</div>}
      <div className="mt-1 flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
        >
          {copied ? "コピー済" : "コピー"}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={share}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            共有
          </button>
        )}
      </div>
    </div>
  );
}
