import { z } from "zod";
import type { ExcelRowValidation, ExcelStudentRow, StudentGender } from "@/types/student";

const genderValues = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"] as const;

export const studentGenderSchema = z.enum(genderValues);

export const studentFormSchema = z.object({
  fullName: z.string().trim().min(1, "Họ tên không được để trống.").max(120),
  studentCode: z.string().trim().min(1, "Mã học sinh không được để trống.").max(50),
  dateOfBirth: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || isValidIsoDate(value), {
      message: "Ngày sinh không hợp lệ. Dùng định dạng YYYY-MM-DD.",
    }),
  gender: studentGenderSchema.optional().default("UNSPECIFIED"),
  notes: z
    .string()
    .trim()
    .max(2000, "Ghi chú tối đa 2000 ký tự.")
    .optional()
    .transform((value) => value ?? ""),
});

export type ParsedStudentForm = z.infer<typeof studentFormSchema>;

const genderAliases: Record<string, StudentGender> = {
  nam: "MALE",
  male: "MALE",
  m: "MALE",
  "nữ": "FEMALE",
  nu: "FEMALE",
  female: "FEMALE",
  f: "FEMALE",
  "khác": "OTHER",
  khac: "OTHER",
  other: "OTHER",
  "chưa chọn": "UNSPECIFIED",
  "chua chon": "UNSPECIFIED",
  unspecified: "UNSPECIFIED",
};

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseGenderInput(raw: string): StudentGender | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return "UNSPECIFIED";
  return genderAliases[normalized] ?? null;
}

export function parseDateInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (isValidIsoDate(trimmed)) return trimmed;

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    const iso = `${year}-${month}-${day}`;
    return isValidIsoDate(iso) ? iso : null;
  }

  return null;
}

export function mapDuplicateStudentCodeError(): string {
  return "Mã học sinh này đã tồn tại trong lớp.";
}

export function validateExcelRows(
  rows: ExcelStudentRow[],
  existingCodes: Set<string>,
): ExcelRowValidation[] {
  const seenInFile = new Map<string, number>();

  return rows.map((row) => {
    const errors: string[] = [];
    const code = row.studentCode.trim();
    const name = row.fullName.trim();
    const normalizedCode = code.toLowerCase();

    if (!code) {
      errors.push("Mã học sinh không được để trống.");
    } else {
      const firstRow = seenInFile.get(normalizedCode);
      if (firstRow !== undefined) {
        errors.push(`Mã học sinh trùng với dòng ${firstRow} trong file.`);
      } else {
        seenInFile.set(normalizedCode, row.rowNumber);
      }

    }

    if (!name) {
      errors.push("Họ tên không được để trống.");
    } else if (name.length > 120) {
      errors.push("Họ tên tối đa 120 ký tự.");
    }

    let parsedDob: string | null = null;
    if (row.dateOfBirth.trim()) {
      parsedDob = parseDateInput(row.dateOfBirth);
      if (!parsedDob) {
        errors.push("Ngày sinh không hợp lệ. Dùng YYYY-MM-DD hoặc DD/MM/YYYY.");
      }
    }

    let parsedGender: StudentGender | null = "UNSPECIFIED";
    if (row.gender.trim()) {
      parsedGender = parseGenderInput(row.gender);
      if (!parsedGender) {
        errors.push("Giới tính không hợp lệ. Dùng Nam, Nữ, Khác hoặc để trống.");
      }
    }

    if (row.notes.trim().length > 2000) {
      errors.push("Ghi chú tối đa 2000 ký tự.");
    }

    return {
      ...row,
      studentCode: code,
      fullName: name,
      dateOfBirth: parsedDob ?? row.dateOfBirth.trim(),
      gender: parsedGender ?? row.gender.trim(),
      notes: row.notes.trim(),
      errors,
      isValid: errors.length === 0,
      alreadyInClass: existingCodes.has(normalizedCode),
    };
  });
}

export function toStudentInsertPayload(
  row: ExcelRowValidation,
  classId: string,
): {
  class_id: string;
  student_code: string;
  full_name: string;
  date_of_birth: string | null;
  gender: StudentGender;
  notes: string;
} {
  const gender = parseGenderInput(String(row.gender)) ?? "UNSPECIFIED";
  const dob = row.dateOfBirth ? parseDateInput(String(row.dateOfBirth)) : null;

  return {
    class_id: classId,
    student_code: row.studentCode,
    full_name: row.fullName,
    date_of_birth: dob,
    gender,
    notes: row.notes,
  };
}
