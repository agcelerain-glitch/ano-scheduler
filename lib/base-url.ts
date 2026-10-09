/**
 * 実際にアクセスされているドメインから base URL を導出する。
 * Vercel の x-forwarded-host / x-forwarded-proto を優先し、
 * 無ければ NEXT_PUBLIC_SITE_URL、最後に localhost にフォールバック。
 * これにより共有リンクが localhost になる問題を防ぐ。
 */
export function baseUrlFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}
