import { z } from "zod";
import { slotCount, type EventTiming } from "./slots";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export const MAX_SLOTS = 2000;

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, "タイトルを入力してください").max(100),
    description: z.string().max(1000).default(""),
    dateStart: z.string().regex(DATE),
    dateEnd: z.string().regex(DATE),
    timeStart: z.string().regex(TIME),
    timeEnd: z.string().regex(TIME),
    slotMinutes: z.coerce.number().int().refine((v) => [15, 30, 60].includes(v), {
      message: "スロット間隔は15/30/60分のいずれか",
    }),
    timezone: z.string().default("Asia/Tokyo"),
  })
  .superRefine((v, ctx) => {
    if (v.dateEnd < v.dateStart) {
      ctx.addIssue({ code: "custom", message: "終了日は開始日以降にしてください", path: ["dateEnd"] });
    }
    if (v.timeEnd <= v.timeStart) {
      ctx.addIssue({ code: "custom", message: "終了時刻は開始時刻より後にしてください", path: ["timeEnd"] });
    }
    const timing: EventTiming = {
      dateStart: v.dateStart,
      dateEnd: v.dateEnd,
      timeStart: v.timeStart,
      timeEnd: v.timeEnd,
      slotMinutes: v.slotMinutes,
      timeZone: v.timezone,
    };
    if (slotCount(timing) > MAX_SLOTS) {
      ctx.addIssue({
        code: "custom",
        message: `候補スロットが多すぎます（最大${MAX_SLOTS}。期間や時間帯を狭めてください）`,
        path: ["dateEnd"],
      });
    }
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const submitResponseSchema = z.object({
  name: z.string().trim().min(1, "名前を入力してください").max(50),
  // ハニーポット（ボット対策）: 空でなければ弾く
  website: z.string().max(0).optional().default(""),
  available: z.array(z.string()).max(MAX_SLOTS),
  memos: z.record(z.string().regex(DATE), z.string().max(500)).optional().default({}),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;

export const editResponseSchema = submitResponseSchema.extend({
  key: z.string().min(1),
});

export type EditResponseInput = z.infer<typeof editResponseSchema>;
