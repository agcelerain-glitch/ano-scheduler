import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendDiscord } from "@/lib/notify";

export const runtime = "nodejs";

/**
 * 管理者専用のヘルスチェック。
 * DB 接続を確認し、Discord に稼働通知を送る。通知経路と死活の両方を検証できる。
 * 管理者認証必須のため、公開のスパム経路にはならない。
 */
export async function POST() {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "権限がありません" }, { status: 401 });
  }

  // DB 疎通確認（件数のみ・行は取得しない）
  let db = false;
  try {
    const { error } = await getAdminClient()
      .from("events")
      .select("id", { count: "exact", head: true });
    db = !error;
  } catch {
    db = false;
  }

  const discord = await sendDiscord({
    title: db ? "✅ ヘルスチェック OK" : "⚠️ ヘルスチェック（DB異常）",
    color: db ? 0x2ecc71 : 0xe74c3c,
    description: `実行者: ${user.email}`,
    fields: [
      { name: "DB", value: db ? "OK" : "NG", inline: true },
      { name: "通知", value: "OK", inline: true },
    ],
  });

  return NextResponse.json({ db, discord });
}
