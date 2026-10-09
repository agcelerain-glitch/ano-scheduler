import type { Metadata } from "next";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ano-scheduler",
    template: "%s | ano-scheduler",
  },
  description: "匿名で使える、シンプルな日程調整ツール。URLを共有して30分刻みで空き時間を集計します。",
  applicationName: "ano-scheduler",
  openGraph: {
    type: "website",
    siteName: "ano-scheduler",
    title: "ano-scheduler",
    description: "URLを共有するだけ。30分刻みで空き時間を集計する日程調整ツール。",
  },
  twitter: { card: "summary" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
