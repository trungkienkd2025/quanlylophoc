import * as XLSX from "xlsx";
import { weeklyAttendanceStatusLabel } from "@/lib/attendance/format";
import { sortStudents } from "@/lib/students/sort";
import { weekLabel } from "@/lib/weeks";
import type { AttendanceStatus } from "@/types/attendance";

export type WeekExportStudent = {
  student_code: string;
  full_name: string;
  status?: AttendanceStatus | null;
  level?: string | null;
  comment?: string | null;
};

export type WeekExportData = {
  week: number;
  startDate?: string | null;
  endDate?: string | null;
  students: WeekExportStudent[];
};

type ExportRow = {
  STT: number;
  "Mã học sinh": string;
  "Họ và tên": string;
  "Điểm danh": string;
  "Đánh giá": string;
  "Nhận xét": string;
};

function formatWeeklyValues(
  weeks: WeekExportData[],
  studentCode: string,
  getValue: (student: WeekExportStudent) => string,
) {
  return weeks
    .flatMap((weekData) => {
      const student = weekData.students.find((item) => item.student_code === studentCode);
      const value = student ? getValue(student).trim() : "";
      return value ? [`${weekLabel(weekData.week)}: ${value}`] : [];
    })
    .join("\n");
}

function buildWeeklyRows(weekData: WeekExportData): ExportRow[] {
  return sortStudents(weekData.students, "name").map((student, index) => ({
    STT: index + 1,
    "Mã học sinh": student.student_code,
    "Họ và tên": student.full_name,
    "Điểm danh": student.status ? weeklyAttendanceStatusLabel(student.status) : "",
    "Đánh giá": student.level ?? "",
    "Nhận xét": student.comment ?? "",
  }));
}

function buildSummaryRows(weeks: WeekExportData[]): ExportRow[] {
  const students = new Map<string, WeekExportStudent>();
  for (const weekData of weeks) {
    for (const student of weekData.students) {
      students.set(student.student_code, student);
    }
  }

  return sortStudents([...students.values()], "name").map((student, index) => ({
    STT: index + 1,
    "Mã học sinh": student.student_code,
    "Họ và tên": student.full_name,
    "Điểm danh": formatWeeklyValues(
      weeks,
      student.student_code,
      (item) => (item.status ? weeklyAttendanceStatusLabel(item.status) : ""),
    ),
    "Đánh giá": formatWeeklyValues(weeks, student.student_code, (item) => item.level ?? ""),
    "Nhận xét": formatWeeklyValues(weeks, student.student_code, (item) => item.comment ?? ""),
  }));
}

function appendSheet(
  workbook: XLSX.WorkBook,
  name: string,
  meta: string[][],
  rows: ExportRow[],
) {
  const sheet = XLSX.utils.aoa_to_sheet([...meta, []]);
  XLSX.utils.sheet_add_json(sheet, rows, { origin: -1 });
  sheet["!cols"] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 28 },
    { wch: 24 },
    { wch: 32 },
    { wch: 52 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

/** Export toàn bộ học sinh từ tuần 1 đến tuần đang chọn, gồm một trang tổng hợp và từng tuần. */
export function downloadWeekReportExcel(input: {
  className: string;
  schoolYear: string;
  throughWeek: number;
  weeks: WeekExportData[];
}) {
  const workbook = XLSX.utils.book_new();
  appendSheet(
    workbook,
    "Tổng hợp",
    [
      ["Lớp", input.className],
      ["Năm học", input.schoolYear],
      ["Tổng hợp đến", weekLabel(input.throughWeek)],
    ],
    buildSummaryRows(input.weeks),
  );

  for (const weekData of input.weeks) {
    appendSheet(
      workbook,
      `Tuan_${weekData.week}`,
      [
        ["Lớp", input.className],
        ["Năm học", input.schoolYear],
        ["Tuần", weekLabel(weekData.week)],
        ["Từ ngày", weekData.startDate ?? ""],
        ["Đến ngày", weekData.endDate ?? ""],
      ],
      buildWeeklyRows(weekData),
    );
  }

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bao_cao_${input.className.replace(/\s+/g, "_")}_tuan_1_den_${input.throughWeek}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
