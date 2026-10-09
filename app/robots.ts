import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 個人情報を含み得るページは明示的にクロール禁止
      disallow: ["/e/", "/admin/", "/api/", "/auth/"],
    },
    host: SITE_URL,
  };
}
