import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * 保持期限（expires_at）を過ぎたイベントを削除する。
 * Vercel Cron から1日1回呼ばれる想定。CRON_SECRET で保護。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("events")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: data?.length ?? 0 });
}
