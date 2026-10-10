"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * フィードバックの既読/未読を切り替える（管理者ごと）。
 * email は必ずサーバー側の user.email を使い、なりすましを防ぐ。
 */
export async function toggleFeedbackReadAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const email = user.email?.toLowerCase();
  if (!email) redirect("/admin/feedback");

  const feedbackId = String(formData.get("feedbackId"));
  const makeRead = formData.get("read") === "true";
  const supabase = getAdminClient();

  if (makeRead) {
    await supabase
      .from("feedback_reads")
      .upsert(
        { feedback_id: feedbackId, email, read_at: new Date().toISOString() },
        { onConflict: "feedback_id,email" }
      );
  } else {
    await supabase
      .from("feedback_reads")
      .delete()
      .eq("feedback_id", feedbackId)
      .eq("email", email);
  }

  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
}
