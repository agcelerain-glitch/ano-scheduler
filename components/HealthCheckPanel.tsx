"use client";

import { useState } from "react";

type Result = { db: boolean; discord: boolean; discordDetail?: string };

export default function HealthCheckPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/healthcheck", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "実行に失敗しました");
        return;
      }
      setResult({
        db: !!data.db,
        discord: !!data.discord,
        discordDetail: data.discordDetail,
      });
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setRunning(false);
    }
  }

  const badge = (ok: boolean) =>
    ok ? (
      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">OK</span>
    ) : (
      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">NG</span>
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">ヘルスチェック</h3>
          <p className="text-xs text-slate-500">DB疎通とDiscord通知を確認します。</p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60"
        >
          {running ? "実行中…" : "実行"}
        </button>
      </div>
      {result && (
        <div className="mt-3 text-sm">
          <div className="flex gap-4">
            <span className="flex items-center gap-2">DB {badge(result.db)}</span>
            <span className="flex items-center gap-2">
              Discord {badge(result.discord)}
            </span>
          </div>
          {!result.discord && result.discordDetail && (
            <p className="mt-2 rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600">
              理由: {result.discordDetail}
            </p>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
