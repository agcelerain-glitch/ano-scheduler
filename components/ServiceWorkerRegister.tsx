"use client";

import { useEffect } from "react";

/** 本番でのみ Service Worker を登録する（開発中のキャッシュ事故を避ける）。 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* 失敗しても PWA 以外の機能には影響しない */
    });
  }, []);
  return null;
}
