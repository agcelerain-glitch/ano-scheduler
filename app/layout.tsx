import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/env";
import FeedbackWidget from "@/components/FeedbackWidget";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ano-scheduler",
    template: "%s | ano-scheduler",
  },
  description: "匿名で使える、シンプルな日程調整ツール。URLを共有して30分刻みで空き時間を集計します。",
  applicationName: "ano-scheduler",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "ano-scheduler",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: "ano-scheduler",
    title: "ano-scheduler",
    description: "URLを共有するだけ。30分刻みで空き時間を集計する日程調整ツール。",
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
        <FeedbackWidget />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
