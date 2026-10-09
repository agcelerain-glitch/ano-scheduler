import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * ユーザーのセッション（Cookie）に紐づくサーバークライアント。
 * 管理者ログイン判定（auth.getUser）に使う。
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component から呼ばれた場合は set 不可（読み取り専用）。無視でよい。
        }
      },
    },
  });
}
