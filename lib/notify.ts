import "server-only";

type DiscordField = { name: string; value: string; inline?: boolean };

export type DiscordMessage = {
  title: string;
  description?: string;
  color?: number;
  fields?: DiscordField[];
};

/**
 * Discord Webhook へ通知を送る（サーバー専用）。
 * - URL は環境変数からのみ参照（クライアントに露出させない）
 * - allowed_mentions を空にして @everyone 等のメンション注入を無効化
 * - 4秒でタイムアウト。Discord 障害でユーザー操作を長時間ブロックしない
 */
export async function sendDiscord(msg: DiscordMessage): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    console.warn("DISCORD_WEBHOOK_URL 未設定のため通知をスキップしました");
    return false;
  }

  const body = {
    username: "ano-scheduler",
    allowed_mentions: { parse: [] as string[] },
    embeds: [
      {
        title: msg.title.slice(0, 256),
        description: msg.description ? msg.description.slice(0, 4000) : undefined,
        color: msg.color ?? 0x5865f2,
        fields: msg.fields?.slice(0, 20).map((f) => ({
          name: f.name.slice(0, 256),
          value: (f.value || "-").slice(0, 1024),
          inline: f.inline ?? false,
        })),
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
