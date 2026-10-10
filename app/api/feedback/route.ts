import { NextResponse } from "next/server";
import { feedbackSchema } from "@/lib/validation";
import { sendDiscord } from "@/lib/notify";
import { getAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request);

  // 公開エンドポイント。1分あたり1回に制限。
  const rl = await checkRateLimit(`feedback:${ip}`, [
    { name: "fb-min", limit: 1, window: "1 m" },
  ]);
  if (!rl.success) {
    return NextResponse.json(
      { error: "送信は1分に1回までです。少し待ってから再度お試しください。" },
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
    // ハニーポット: ボット疑い。保存も通知もせず、成功したふりをする。
    return NextResponse.json({ ok: true });
  }

  const message = input.message.trim();
  const target = input.target.trim();
  const isAccess = input.kind === "access_request";

  if (isAccess) {
    if (!target) {
      return NextResponse.json(
        { error: "希望する予定（イベント名など）を入力してください" },
        { status: 400 }
      );
    }
  } else if (!message) {
    return NextResponse.json({ error: "内容を入力してください" }, { status: 400 });
  }

  // 1) まず DB に保存（取りこぼし防止）
  const supabase = getAdminClient();
  const { error: insErr } = await supabase.from("feedback").insert({
    kind: input.kind,
    message,
    target,
    contact: input.contact,
    path: input.path,
    ip_hash: hashToken(ip),
  });
  if (insErr) {
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  // 2) Discord へ即時通知（ベストエフォート。失敗しても保存済みなので ok を返す）
  await sendDiscord({
    title: isAccess ? "🙋 参加リクエスト" : "📝 システムフィードバック",
    color: isAccess ? 0xf1c40f : 0x5865f2,
    description: message || "-",
    fields: [
      ...(isAccess ? [{ name: "希望する予定", value: target }] : []),
      { name: "連絡先", value: input.contact || "-", inline: true },
      { name: "送信元", value: input.path || "-", inline: true },
    ],
  });

  return NextResponse.json({ ok: true });
}
