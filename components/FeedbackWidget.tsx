"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function send() {
    if (!message.trim()) {
      setState("error");
      setErrorMsg("内容を入力してください");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          message,
          contact,
          path: pathname,
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
      setMessage("");
      setContact("");
    } catch {
      setErrorMsg("通信エラーが発生しました");
      setState("error");
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-300 bg-white p-4 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">フィードバック</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-700"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>

          {state === "done" ? (
            <div className="py-4 text-center text-sm text-emerald-700">
              送信しました。ありがとうございます！
              <button
                onClick={() => setState("idle")}
                className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                続けて送る
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="不具合・要望・感想など"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={200}
                placeholder="返信用の連絡先（任意）"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
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
              {state === "error" && (
                <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
              )}
              <button
                onClick={send}
                disabled={state === "sending"}
                className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {state === "sending" ? "送信中…" : "送信"}
              </button>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-slate-700"
        >
          💬 フィードバック
        </button>
      )}
    </div>
  );
}
