/**
 * 共有リンク用の base URL を決める。
 * 優先順位:
 *   1. NEXT_PUBLIC_SITE_URL           … 独自ドメイン等の明示設定（最優先）
 *   2. VERCEL_PROJECT_PRODUCTION_URL  … Vercel の本番ドメイン（ブランチ接尾辞を含まない）
 *   3. リクエストのホスト              … ローカル開発やプレビュー直アクセス
 *   4. http://localhost:3000
 *
 * これにより、長いデプロイ固有URL（例: ano-scheduler-xxxx.vercel.app）ではなく
 * 正式ドメイン（例: ano-scheduler.vercel.app）で共有リンクを生成する。
 */
export function getBaseUrl(h?: Headers): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod.replace(/\/$/, "")}`;

  if (h) {
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ??
        (host.startsWith("localhost") || host.startsWith("127.")
          ? "http"
          : "https");
      return `${proto}://${host}`;
    }
  }
  return "http://localhost:3000";
}
