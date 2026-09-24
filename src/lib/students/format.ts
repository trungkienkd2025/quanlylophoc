import type { StudentGender } from "@/types/student";

export const GENDER_OPTIONS: { value: StudentGender; label: string }[] = [
  { value: "UNSPECIFIED", label: "Chưa chọn" },
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

export function genderLabel(gender: StudentGender): string {
  return GENDER_OPTIONS.find((option) => option.value === gender)?.label ?? "Chưa chọn";
}

export function formatDateVi(isoDate: string | null): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

export function formatBirthYear(isoDate: string | null): string {
  if (!isoDate) return "—";

  const year = isoDate.split("-")[0];
  return /^\d{4}$/.test(year) ? year : "—";
}

export function formatDateTimeVi(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return isoDateTime;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
