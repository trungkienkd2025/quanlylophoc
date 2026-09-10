"use server";

import { ensureTeacherProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { scheduleSchema, type ScheduleRows } from "@/lib/schedules";

export type SaveScheduleResult =
  | { success: true }
  | { success: false; error: string };

export async function saveSchedule(
  schedule: ScheduleRows,
): Promise<SaveScheduleResult> {
  const parsed = scheduleSchema.safeParse(schedule);
  if (!parsed.success) {
    return {
      success: false,
      error: "Nội dung thời khóa biểu chưa hợp lệ. Vui lòng kiểm tra lại.",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      };
    }

    const profileResult = await ensureTeacherProfile(supabase, user);
    if (profileResult.error) {
      return {
        success: false,
        error: "Chưa thể lưu thời khóa biểu. Vui lòng thử lại.",
      };
    }

    const { error } = await supabase.from("teacher_schedules").upsert(
      {
        teacher_id: user.id,
        schedule: parsed.data,
      },
      { onConflict: "teacher_id" },
    );

    if (error) {
      console.error("Unable to save teacher schedule", { code: error.code });
      const needsDatabaseUpdate =
        error.code === "42P01" || error.code === "42501";
      return {
        success: false,
        error: needsDatabaseUpdate
          ? "Chức năng lưu thời khóa biểu chưa sẵn sàng. Vui lòng báo quản trị viên cập nhật hệ thống."
          : "Chưa thể lưu thời khóa biểu. Vui lòng thử lại.",
      };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Chưa thể lưu thời khóa biểu. Vui lòng thử lại.",
    };
  }
}
