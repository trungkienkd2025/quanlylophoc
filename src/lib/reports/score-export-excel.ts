import * as XLSX from "xlsx";
import type {
  ClassLearningScoreReport,
  LearningScoreType,
} from "@/types/reports";

function scoreTypeLabel(type: LearningScoreType) {
  return type === "semester" ? "Điểm học kỳ 1" : "Điểm cả năm";
}

function safeFilenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function safeSheetName(name: string, index: number) {
  return (name.replace(/[\\/?*\[\]:]/g, " ").trim() || `Lop ${index + 1}`).slice(
    0,
    31,
  );
}

function appendScoreSheet(
  workbook: XLSX.WorkBook,
  report: ClassLearningScoreReport,
  type: LearningScoreType,
  sheetName: string,
) {
  const rows = report.entries.map((entry, index) => [
    index + 1,
    entry.studentCode,
    entry.fullName,
    entry.theoryScore,
    entry.practiceScore,
    entry.totalScore,
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Lớp", report.className],
    ["Năm học", report.schoolYearName],
    ["Loại điểm", scoreTypeLabel(type)],
    [],
    ["STT", "Mã học sinh", "Họ và tên", "Lý thuyết", "Thực hành", "Tổng"],
    ...rows,
  ]);
  sheet["!cols"] = [
    { wch: 7 },
    { wch: 16 },
    { wch: 30 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
}

function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadLearningScoreReportsExcel(
  reports: ClassLearningScoreReport[],
  type: LearningScoreType,
) {
  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  reports.forEach((report, index) => {
    const baseName = safeSheetName(report.className, index);
    let sheetName = baseName;
    let duplicate = 2;
    while (usedSheetNames.has(sheetName)) {
      const suffix = ` (${duplicate})`;
      sheetName = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
      duplicate += 1;
    }
    usedSheetNames.add(sheetName);
    appendScoreSheet(workbook, report, type, sheetName);
  });

  const schoolYearName = reports[0]?.schoolYearName ?? "nam_hoc";
  const typePart = type === "semester" ? "hoc_ky_1" : "ca_nam";
  downloadWorkbook(
    workbook,
    `bang_diem_${typePart}_${safeFilenamePart(schoolYearName)}.xlsx`,
  );
}
