import "server-only";

type DiscordField = { name: string; value: string; inline?: boolean };

export type DiscordMessage = {
  title: string;
  description?: string;
  color?: number;
  fields?: DiscordField[];
};

export type DiscordResult = { ok: boolean; detail: string };

/**
 * Discord Webhook へ通知を送る（サーバー専用）。
 * - URL は環境変数からのみ参照（クライアントに露出させない）
 * - allowed_mentions を空にして @everyone 等のメンション注入を無効化
 * - 4秒でタイムアウト
 * - 成否と理由(detail)を返すので、ヘルスチェック等で原因を特定できる
 */
export async function sendDiscord(msg: DiscordMessage): Promise<DiscordResult> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    return { ok: false, detail: "DISCORD_WEBHOOK_URL が未設定です" };
  }
  if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(url)) {
    return {
      ok: false,
      detail: "URL 形式が不正です（Discord の Webhook URL ではない可能性）",
    };
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
    if (res.ok) return { ok: true, detail: `HTTP ${res.status}` };
    let text = "";
    try {
      text = (await res.text()).slice(0, 200);
    } catch {
      /* noop */
    }
    return { ok: false, detail: `HTTP ${res.status} ${text}`.trim() };
  } catch (e) {
    const name = e instanceof Error ? e.name : "error";
    return {
      ok: false,
      detail: name === "AbortError" ? "タイムアウト(4s)" : `送信失敗: ${name}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
