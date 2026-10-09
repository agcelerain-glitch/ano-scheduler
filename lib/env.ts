export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}
