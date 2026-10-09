import { createHash, randomBytes } from "crypto";

/** 推測困難な秘密キー（編集キー等）を生成。URL-safe base64。 */
export function generateKey(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 の16進ハッシュ。トークンは平文保存せずこれを保存する。 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** タイミング攻撃を避けるための定数時間比較（同長の16進文字列を想定）。 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
