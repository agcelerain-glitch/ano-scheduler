import { NextResponse } from "next/server";
import { requireAdmin, canManageEvent } from "@/lib/auth";
import { getEventData, timingOf } from "@/lib/events";
import { buildPivot } from "@/lib/aggregate";
import { buildCsv } from "@/lib/csv";

// 暗号・サーバー専用処理を含むため Node.js ランタイム固定。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 集計のCSV出力（管理者限定）。
 * proxy.ts の /admin 保護に加え、ここでも requireAdmin() で再検証（多層防御）。
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await requireAdmin();
  const { eventId } = await params;

  const data = await getEventData(eventId);
  if (!data) return new NextResponse("Not Found", { status: 404 });
  // 他人のイベントのCSVは出力させない（最上位は全件可）。存在は秘匿して 404。
  if (!canManageEvent(user, data.event.owner_email)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const pivot = buildPivot(timingOf(data.event), data.participants, data.responses);
  const csv = buildCsv(data.event, pivot);

  // Excel で文字化けしないよう UTF-8 BOM を付与。
  const body = "﻿" + csv;
  const asciiName = `votes_${data.event.id.slice(0, 8)}.csv`;
  const utf8Name = encodeURIComponent(`${data.event.title || "votes"}.csv`);

  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      "cache-control": "no-store",
    },
  });
}
