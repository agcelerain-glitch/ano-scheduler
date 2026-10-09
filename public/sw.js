// ano-scheduler Service Worker
// 役割: PWA のインストール要件を満たす fetch ハンドラ＋静的アセットの簡易キャッシュ。
// 認証・API・管理・個人データページ(/e)はキャッシュせず常に最新を取得する。

const CACHE = "ano-scheduler-v1";
const PRECACHE = [
  "/",
  "/favicon.ico",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 認証/ API / 管理 / 回答ページ は常にネットワーク（キャッシュしない）
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/e/")
  ) {
    return;
  }

  // ページ遷移: ネットワーク優先、オフライン時のみトップにフォールバック
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  // 静的アセット(_next/static・画像・フォント): キャッシュ優先＋保存（内容ハッシュ付きで安全）
  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(png|ico|svg|jpe?g|webp|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
              return res;
            })
            .catch(() => cached)
      )
    );
  }
});
