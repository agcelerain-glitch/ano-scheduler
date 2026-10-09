import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * service_role を使うサーバー専用クライアント。RLS をバイパスする。
 * 絶対にクライアントコンポーネントから import しないこと。
 */
export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase の環境変数が未設定です（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）"
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
