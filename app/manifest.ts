import type { MetadataRoute } from "next";

/**
 * Web App Manifest（/manifest.webmanifest として配信）。
 * Next.js が自動で <link rel="manifest"> を挿入する。
 * アイコンは public/ 配下の実ファイルを参照。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ano-scheduler",
    short_name: "ano-sched",
    description: "匿名で使える、シンプルな日程調整ツール",
    lang: "ja",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
