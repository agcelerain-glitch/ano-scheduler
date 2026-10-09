"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/env";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const redirectParam =
      new URLSearchParams(window.location.search).get("redirect") || "/admin";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${SITE_URL}/auth/callback?redirect=${encodeURIComponent(
          redirectParam
        )}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  const hasAuthError =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("error") === "auth";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-bold">管理画面ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">
          許可されたGoogleアカウントのみログインできます。
        </p>

        {(error || hasAuthError) && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error || "認証に失敗しました。許可されたアカウントか確認してください。"}
          </p>
        )}

        <button
          onClick={signIn}
          disabled={loading}
          className="mt-6 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "リダイレクト中…" : "Googleでログイン"}
        </button>
      </div>
    </main>
  );
}
