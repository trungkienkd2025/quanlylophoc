import * as XLSX from "xlsx";
import { weeklyAttendanceStatusLabel } from "@/lib/attendance/format";
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

/** Export toàn bộ học sinh từ tuần 1 đến tuần đang chọn, mỗi tuần ở một trang tính. */
export function downloadWeekReportExcel(input: {
  className: string;
  schoolYear: string;
  throughWeek: number;
  weeks: WeekExportData[];
}) {
  const workbook = XLSX.utils.book_new();
  for (const weekData of input.weeks) {
    const sorted = [...weekData.students].sort((a, b) =>
      a.full_name.localeCompare(b.full_name, "vi", { sensitivity: "base" }),
    );
    const rows = sorted.map((student, index) => ({
      STT: index + 1,
      "Mã học sinh": student.student_code,
      "Họ và tên": student.full_name,
      "Điểm danh": student.status ? weeklyAttendanceStatusLabel(student.status) : "",
      "Đánh giá": student.level ?? "",
      "Nhận xét": student.comment ?? "",
    }));
    const meta = [
      ["Lớp", input.className],
      ["Năm học", input.schoolYear],
      ["Tuần", weekLabel(weekData.week)],
      ["Từ ngày", weekData.startDate ?? ""],
      ["Đến ngày", weekData.endDate ?? ""],
      [],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(meta);
    XLSX.utils.sheet_add_json(sheet, rows, { origin: -1 });
    XLSX.utils.book_append_sheet(workbook, sheet, `Tuan_${weekData.week}`);
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
