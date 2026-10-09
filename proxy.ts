import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isAllowedEmail } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isLogin = pathname === "/admin/login";
  if (!isLogin) {
    if (!user || !isAllowedEmail(user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // /admin 配下でのみ実行（公開ページでは認証チェックを走らせない）
  matcher: ["/admin/:path*"],
};
