"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyClassAccess } from "@/lib/classes/access";
import {
  getLocalDateString,
  isFutureDateString,
  isIsoDateString,
} from "@/lib/dates";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";

export type AttendanceActionState = {
  error?: string;
  success?: string;
};

const attendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "EXCUSED", "LATE"]);

const attendanceEntrySchema = z.object({
  student_id: z.string().uuid(),
  status: attendanceStatusSchema,
  note: z.string().max(500),
});

const saveAttendanceSchema = z.object({
  date: z.string().refine(isIsoDateString, "Ngày điểm danh không hợp lệ."),
  entries: z.array(attendanceEntrySchema),
});

function buildEntriesToSave(
  entries: AttendanceRecord[],
  savedRecords: Record<string, AttendanceRecord>,
): AttendanceRecord[] {
  return entries.filter((entry) => {
    const saved = savedRecords[entry.student_id];
    if (entry.status !== "PRESENT" || entry.note.trim()) return true;
    return Boolean(saved);
  });
}

export async function saveAttendance(
  classId: string,
  date: string,
  entries: AttendanceRecord[],
  savedRecords: Record<string, AttendanceRecord>,
): Promise<AttendanceActionState> {
  const access = await verifyClassAccess(classId);
  if (!access.ok) return { error: access.error };

  if (isFutureDateString(date)) {
    return { error: "Không thể điểm danh cho ngày trong tương lai." };
  }

  const entriesToSave = buildEntriesToSave(entries, savedRecords);
  const parsed = saveAttendanceSchema.safeParse({ date, entries: entriesToSave });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu điểm danh không hợp lệ." };
  }

  if (entriesToSave.length === 0) {
    return { success: "Đã lưu điểm danh." };
  }

  const payload = entriesToSave.map((entry) => ({
    student_id: entry.student_id,
    status: entry.status,
    note: entry.note.trim(),
  }));

  const { error } = await access.supabase.rpc("save_attendance", {
    p_class_id: access.classId,
    p_date: parsed.data.date,
    p_entries: payload,
  });

  if (error) {
    return { error: "Chưa thể lưu điểm danh. Vui lòng thử lại." };
  }

  revalidatePath(`/classes/${access.classId}/session`);
  revalidatePath(`/classes/${access.classId}/attendance`);
  return { success: "Đã lưu điểm danh." };
}

export async function saveStudentAttendanceToday(
  classId: string,
  studentId: string,
  status: Extract<AttendanceStatus, "PRESENT" | "ABSENT"> | null,
): Promise<AttendanceActionState> {
  const access = await verifyClassAccess(classId);
  if (!access.ok) return { error: access.error };

  const parsed = z
    .object({
      studentId: z.string().uuid(),
      status: z.enum(["PRESENT", "ABSENT"]).nullable(),
    })
    .safeParse({ studentId, status });
  if (!parsed.success) {
    return { error: "Thông tin điểm danh không hợp lệ." };
  }

  if (parsed.data.status === null) {
    const { error } = await access.supabase
      .from("attendance")
      .delete()
      .eq("class_id", access.classId)
      .eq("student_id", parsed.data.studentId)
      .eq("date", getLocalDateString());

    if (error) {
      return { error: "Chưa thể bỏ lựa chọn. Vui lòng thử lại." };
    }

    revalidatePath(`/classes/${access.classId}/students`);
    revalidatePath(`/classes/${access.classId}/session`);
    revalidatePath(`/classes/${access.classId}/attendance`);
    return { success: "Đã bỏ lựa chọn." };
  }

  const { error } = await access.supabase.rpc("save_attendance", {
    p_class_id: access.classId,
    p_date: getLocalDateString(),
    p_entries: [
      {
        student_id: parsed.data.studentId,
        status: parsed.data.status,
        note: "",
      },
    ],
  });

  if (error) {
    return { error: "Chưa thể lưu điểm danh. Vui lòng thử lại." };
  }

  revalidatePath(`/classes/${access.classId}/students`);
  revalidatePath(`/classes/${access.classId}/session`);
  revalidatePath(`/classes/${access.classId}/attendance`);
  return { success: "Đã lưu điểm danh hôm nay." };
}
