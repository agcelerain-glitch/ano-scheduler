"use client";

import { useState } from "react";

export default function AccessRequestForm() {
  const [target, setTarget] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function send() {
    if (!target.trim()) {
      setState("error");
      setErrorMsg("希望する予定を入力してください");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "access_request",
          target,
          message,
          contact,
          path: "/",
          website: honeypot,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d.error ?? "送信に失敗しました");
        setState("error");
        return;
      }
      setState("done");
      setTarget("");
      setMessage("");
      setContact("");
    } catch {
      setErrorMsg("通信エラーが発生しました");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        リクエストを送信しました。主催者からの連絡をお待ちください。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        maxLength={200}
        placeholder="参加したい予定の名前・内容"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        maxLength={200}
        placeholder="連絡先（任意・返信が必要な場合）"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="補足メッセージ（任意）"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
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
      {state === "error" && <p className="text-xs text-red-600">{errorMsg}</p>}
      <button
        onClick={send}
        disabled={state === "sending"}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {state === "sending" ? "送信中…" : "投票権をリクエスト"}
      </button>
    </div>
  );
}
