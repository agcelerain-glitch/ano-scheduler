import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isProd } from "./env";

type Window = Parameters<typeof Ratelimit.slidingWindow>[1];

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

const limiters = new Map<string, Ratelimit>();
function getLimiter(name: string, limit: number, window: Window): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const key = `${name}:${limit}:${window}`;
  let l = limiters.get(key);
  if (!l) {
    l = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `rl:${name}`,
      analytics: false,
    });
    limiters.set(key, l);
  }
  return l;
}

export type RateRule = { name: string; limit: number; window: Window };

/**
 * 複数ルールを全て満たす必要がある（AND）。1つでも超過したら success=false。
 * Upstash 未設定時は、本番ではフェイルクローズ（拒否）＝「少し堅牢」寄りの挙動。
 * 開発時（NODE_ENV!=production）は通す。
 */
export async function checkRateLimit(
  identifier: string,
  rules: RateRule[]
): Promise<{ success: boolean }> {
  const configured = getRedis() !== null;
  if (!configured) {
    return { success: !isProd() };
  }
  for (const rule of rules) {
    const limiter = getLimiter(rule.name, rule.limit, rule.window);
    if (!limiter) return { success: !isProd() };
    const res = await limiter.limit(identifier);
    if (!res.success) return { success: false };
  }
  return { success: true };
}

/** リクエストからクライアントIPを推定する。 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}
