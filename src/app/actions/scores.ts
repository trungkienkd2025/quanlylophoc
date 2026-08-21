"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyClassAccess } from "@/lib/classes/access";

const score = z.union([z.literal(""), z.coerce.number().min(0).max(10)]);
const entrySchema = z.object({
  student_id: z.string().uuid(),
  theory_score: score,
  practice_score: score,
  total_score: z.coerce.number().int().min(0).max(10),
});
const saveSchema = z.object({ type: z.enum(["semester", "annual"]), entries: z.array(entrySchema) });

/** Form inputs send strings; Zod coerces to number | "". */
export type ScoreEntryInput = {
  student_id: string;
  theory_score: string | number | "";
  practice_score: string | number | "";
  total_score: number;
};

export async function saveScores(classId: string, type: "semester" | "annual", entries: ScoreEntryInput[]) {
  const access = await verifyClassAccess(classId);
  if (!access.ok) return { error: access.error };
  const parsed = saveSchema.safeParse({ type, entries });
  if (!parsed.success) return { error: "Điểm phải nằm trong khoảng 0 đến 10." };
  const rows = parsed.data.entries.map((e) => ({ class_id: access.classId, student_id: e.student_id, theory_score: e.theory_score === "" ? null : e.theory_score, practice_score: e.practice_score === "" ? null : e.practice_score }));
  const table = parsed.data.type === "semester" ? "semester_scores" : "annual_scores";
  const { error } = await access.supabase.from(table).upsert(rows, { onConflict: "student_id" });
  if (error) return { error: "Chưa thể lưu điểm. Vui lòng thử lại." };
  revalidatePath(`/classes/${access.classId}/scores`);
  revalidatePath(`/classes/${access.classId}`);
  return { success: "Đã lưu điểm học tập." };
}
