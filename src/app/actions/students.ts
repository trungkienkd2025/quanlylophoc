"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyClassAccess } from "@/lib/classes/access";
import {
  mapDuplicateStudentCodeError,
  studentFormSchema,
  toStudentInsertPayload,
  validateExcelRows,
} from "@/lib/students/validation";
import { EXCEL_IMPORT_LIMITS } from "@/lib/students/import-limits";
import type { ExcelRowValidation, StudentGender } from "@/types/student";

export type ActionState = {
  error?: string;
  success?: string;
};

function mapStudentMutationError(error: {
  code?: string;
  message?: string;
}): string {
  if (error.code === "23505") return mapDuplicateStudentCodeError();
  return "Chưa thể lưu học sinh. Vui lòng thử lại.";
}

export async function createStudent(
  classId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await verifyClassAccess(classId);
  if (!access.ok) return { error: access.error };

  const parsed = studentFormSchema.safeParse({
    fullName: formData.get("fullName"),
    studentCode: formData.get("studentCode"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    gender: formData.get("gender") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Thông tin học sinh chưa hợp lệ.",
    };
  }

  const { error } = await access.supabase.from("students").insert({
    class_id: access.classId,
    student_code: parsed.data.studentCode,
    full_name: parsed.data.fullName,
    date_of_birth: parsed.data.dateOfBirth ?? null,
    gender: parsed.data.gender,
    notes: parsed.data.notes,
  });

  if (error) return { error: mapStudentMutationError(error) };

  revalidatePath(`/classes/${access.classId}/students`);
  revalidatePath(`/classes/${access.classId}`);
  revalidatePath("/dashboard");
  revalidatePath("/class-management");
  return { success: "Đã thêm học sinh." };
}

export async function updateStudent(
  classId: string,
  studentId: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await verifyClassAccess(classId);
  if (!access.ok) return { error: access.error };

  const parsed = studentFormSchema.safeParse({
    fullName: formData.get("fullName"),
    studentCode: formData.get("studentCode"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    gender: formData.get("gender") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Thông tin học sinh chưa hợp lệ.",
    };
  }

  const expectedUpdatedAt = String(formData.get("updatedAt") ?? "").trim();

  const { data: existing } = await access.supabase
    .from("students")
    .select("id, updated_at")
    .eq("id", studentId)
    .eq("class_id", access.classId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return {
      error: "Không tìm thấy học sinh hoặc học sinh đã bị xóa khỏi lớp.",
    };
  }

  if (expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
    return {
      error:
        "Học sinh vừa được cập nhật ở nơi khác. Vui lòng tải lại trang và thử lại.",
    };
  }

  const { error } = await access.supabase
    .from("students")
    .update({
      student_code: parsed.data.studentCode,
      full_name: parsed.data.fullName,
      date_of_birth: parsed.data.dateOfBirth ?? null,
      gender: parsed.data.gender,
      notes: parsed.data.notes,
    })
    .eq("id", studentId)
    .eq("class_id", access.classId)
    .is("deleted_at", null);

  if (error) return { error: mapStudentMutationError(error) };

  revalidatePath(`/classes/${access.classId}/students`);
  revalidatePath(`/classes/${access.classId}/students/${studentId}`);
  revalidatePath(`/classes/${access.classId}`);
  revalidatePath("/dashboard");
  revalidatePath("/class-management");
  return { success: "Đã lưu thông tin học sinh." };
}

export async function softDeleteStudent(
  classId: string,
  studentId: string,
): Promise<ActionState> {
  const access = await verifyClassAccess(classId);
  if (!access.ok) return { error: access.error };

  const { data: existing } = await access.supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("class_id", access.classId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return {
      error: "Không tìm thấy học sinh hoặc học sinh đã bị xóa khỏi lớp.",
    };
  }

  const { error } = await access.supabase
    .from("students")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", studentId)
    .eq("class_id", access.classId)
    .is("deleted_at", null);

  if (error) return { error: "Chưa thể xóa học sinh. Vui lòng thử lại." };

  revalidatePath(`/classes/${access.classId}/students`);
  revalidatePath(`/classes/${access.classId}`);
  revalidatePath("/dashboard");
  revalidatePath("/class-management");
  return { success: "Đã đưa học sinh ra khỏi danh sách lớp." };
}

export async function softDeleteAllStudents(
  classId: string,
): Promise<ActionState> {
  const access = await verifyClassAccess(classId);
  if (!access.ok) return { error: access.error };

  const { data: deletedStudents, error } = await access.supabase
    .from("students")
    .update({ deleted_at: new Date().toISOString() })
    .eq("class_id", access.classId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    return {
      error: "Chưa thể xóa danh sách học sinh. Vui lòng thử lại.",
    };
  }

  revalidatePath(`/classes/${access.classId}/students`);
  revalidatePath(`/classes/${access.classId}`);
  revalidatePath("/dashboard");
  revalidatePath("/class-management");

  const deletedCount = deletedStudents?.length ?? 0;
  return deletedCount > 0
    ? { success: `Đã đưa ${deletedCount} học sinh ra khỏi lớp.` }
    : { success: "Lớp hiện không có học sinh để xóa." };
}

const importRowSchema = z.object({
  student_code: z.string().trim().min(1).max(50),
  full_name: z.string().trim().min(1).max(120),
  date_of_birth: z.string().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]),
  notes: z.string().max(2000),
});

export async function importStudents(
  classId: string,
  rows: ExcelRowValidation[],
): Promise<ActionState & { importedCount?: number }> {
  const access = await verifyClassAccess(classId);
  if (!access.ok) return { error: access.error };

  if (rows.length === 0) {
    return { error: "Không có dòng học sinh để nhập." };
  }

  if (rows.length > EXCEL_IMPORT_LIMITS.maxRows) {
    return {
      error: `File có quá nhiều học sinh. Tối đa ${EXCEL_IMPORT_LIMITS.maxRows} dòng mỗi lần nhập.`,
    };
  }

  if (rows.some((row) => !row.isValid)) {
    return { error: "File có lỗi. Vui lòng sửa file Excel và tải lại." };
  }

  const payload = rows.map((row) => {
    const insertRow = toStudentInsertPayload(row, access.classId);
    return importRowSchema.parse({
      student_code: insertRow.student_code,
      full_name: insertRow.full_name,
      date_of_birth: insertRow.date_of_birth,
      gender: insertRow.gender as StudentGender,
      notes: insertRow.notes,
    });
  });

  const { data, error } = await access.supabase.rpc("import_students", {
    p_class_id: access.classId,
    p_students: payload,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Có mã học sinh trùng trong lớp. Vui lòng kiểm tra lại file.",
      };
    }
    return { error: "Chưa thể nhập danh sách. Vui lòng thử lại." };
  }

  const importedCount = typeof data === "number" ? data : rows.length;

  revalidatePath(`/classes/${access.classId}/students`);
  revalidatePath(`/classes/${access.classId}`);
  revalidatePath("/dashboard");
  revalidatePath("/class-management");
  return { success: `Đã thêm ${importedCount} học sinh.`, importedCount };
}

export async function getExistingStudentCodes(
  classId: string,
): Promise<string[]> {
  const access = await verifyClassAccess(classId);
  if (!access.ok) return [];

  const { data } = await access.supabase
    .from("students")
    .select("student_code")
    .eq("class_id", access.classId)
    .is("deleted_at", null);

  return (data ?? []).map((student: { student_code: string }) =>
    student.student_code.toLowerCase(),
  );
}

export async function validateImportRows(
  classId: string,
  rows: ExcelRowValidation[],
): Promise<ExcelRowValidation[]> {
  const existingCodes = new Set(await getExistingStudentCodes(classId));
  return validateExcelRows(
    rows.map(
      ({ rowNumber, studentCode, fullName, dateOfBirth, gender, notes }) => ({
        rowNumber,
        studentCode,
        fullName,
        dateOfBirth,
        gender,
        notes,
      }),
    ),
    existingCodes,
  );
}
