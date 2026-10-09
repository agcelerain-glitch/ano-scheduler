import { NextResponse } from "next/server";
import { feedbackSchema } from "@/lib/validation";
import { sendDiscord } from "@/lib/notify";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request);

  // 公開エンドポイントのため、乱用（Discordスパム）対策を強めに
  const rl = await checkRateLimit(`feedback:${ip}`, [
    { name: "fb-burst", limit: 3, window: "1 m" },
    { name: "fb-day", limit: 20, window: "1 d" },
  ]);
  if (!rl.success) {
    return NextResponse.json(
      { error: "送信が多すぎます。しばらく待ってから再度お試しください。" },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力エラー" },
      { status: 400 }
    );
  }
  const input = parsed.data;
  if (input.website) {
    // ハニーポット: ボット疑い。成功したふりをして静かに破棄。
    return NextResponse.json({ ok: true });
  }

  const message = input.message.trim();
  const target = input.target.trim();

  if (input.kind === "access_request") {
    if (!target) {
      return NextResponse.json(
        { error: "希望する予定（イベント名など）を入力してください" },
        { status: 400 }
      );
    }
  } else if (!message) {
    return NextResponse.json(
      { error: "内容を入力してください" },
      { status: 400 }
    );
  }

  const isAccess = input.kind === "access_request";
  const ok = await sendDiscord({
    title: isAccess ? "🙋 投票権リクエスト" : "📝 フィードバック",
    color: isAccess ? 0xf1c40f : 0x5865f2,
    description: message || "-",
    fields: [
      ...(isAccess ? [{ name: "希望する予定", value: target }] : []),
      { name: "連絡先", value: input.contact || "-", inline: true },
      { name: "送信元", value: input.path || "-", inline: true },
    ],
  });

  if (!ok) {
    return NextResponse.json(
      { error: "通知の送信に失敗しました。時間をおいて再度お試しください。" },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
