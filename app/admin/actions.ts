"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { createEventSchema } from "@/lib/validation";

export type ActionState = { error?: string; ok?: boolean };

export async function createEventAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAdmin();

  const parsed = createEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    dateStart: formData.get("dateStart"),
    dateEnd: formData.get("dateEnd"),
    timeStart: formData.get("timeStart"),
    timeEnd: formData.get("timeEnd"),
    slotMinutes: formData.get("slotMinutes"),
    timezone: formData.get("timezone") ?? "Asia/Tokyo",
    allowOverlap: formData.get("allowOverlap") ?? "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力に誤りがあります" };
  }
  const v = parsed.data;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: v.title,
      description: v.description,
      owner_email: user.email,
      date_start: v.dateStart,
      date_end: v.dateEnd,
      time_start: v.timeStart,
      time_end: v.timeEnd,
      slot_minutes: v.slotMinutes,
      timezone: v.timezone,
      allow_overlap: v.allowOverlap,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: `作成に失敗しました: ${error?.message ?? "unknown"}` };
  }

  revalidatePath("/admin");
  redirect(`/admin/events/${data.id}`);
}

export async function updateEventAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("eventId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "");

  if (!title) return { error: "タイトルを入力してください" };
  if (title.length > 100) return { error: "タイトルが長すぎます（100文字まで）" };
  if (description.length > 1000)
    return { error: "説明が長すぎます（1000文字まで）" };

  const { error } = await getAdminClient()
    .from("events")
    .update({ title, description })
    .eq("id", id);
  if (error) return { error: `更新に失敗しました: ${error.message}` };

  revalidatePath(`/admin/events/${id}`);
  return { ok: true };
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("eventId"));
  await getAdminClient().from("events").delete().eq("id", id);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function toggleCloseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("eventId"));
  const close = formData.get("close") === "true";
  await getAdminClient().from("events").update({ is_closed: close }).eq("id", id);
  revalidatePath(`/admin/events/${id}`);
}

export async function deleteParticipantAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const participantId = String(formData.get("participantId"));
  const eventId = String(formData.get("eventId"));
  await getAdminClient().from("participants").delete().eq("id", participantId);
  revalidatePath(`/admin/events/${eventId}`);
}
