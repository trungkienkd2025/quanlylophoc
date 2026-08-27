import * as XLSX from "xlsx";
import { formatReportRangeLabel } from "@/lib/reports/range";
import type { ClassReportData, MultiClassReportData } from "@/types/reports";

function reportRows(report: ClassReportData) {
  return [
    { "Nội dung": "Tổng số học sinh trong lớp", "Số lượng": report.activeStudents },
    { "Nội dung": "Số học sinh vắng", "Số lượng": report.absentStudents },
    { "Nội dung": "Số học sinh tốt", "Số lượng": report.evaluations.good },
    { "Nội dung": "Số học sinh khá", "Số lượng": report.evaluations.fair },
    { "Nội dung": "Số học sinh trung bình", "Số lượng": report.evaluations.average },
    { "Nội dung": "Số học sinh yếu", "Số lượng": report.evaluations.weak },
  ];
}

function appendReportSheet(workbook: XLSX.WorkBook, report: ClassReportData, sheetName: string) {
  const meta = [
    ["Lớp", report.className],
    ["Khoảng thời gian", formatReportRangeLabel(report.range)],
    ["Ghi chú", "Mức đánh giá lấy theo đánh giá tuần mới nhất của từng học sinh."],
    [],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.sheet_add_json(sheet, reportRows(report), { origin: -1 });
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
}

function safeSheetName(name: string, index: number) {
  const normalized = name.replace(/[\\/?*\[\]:]/g, " ").trim() || `Lop ${index + 1}`;
  return normalized.slice(0, 31);
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

export function downloadClassEvaluationReportExcel(report: ClassReportData) {
  const workbook = XLSX.utils.book_new();
  appendReportSheet(workbook, report, "Bao_cao_lop");
  downloadWorkbook(workbook, `bao_cao_${report.className.replace(/\s+/g, "_")}.xlsx`);
}

export function downloadMultiClassEvaluationReportExcel(report: MultiClassReportData) {
  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  for (const [index, classReport] of report.reports.entries()) {
    const baseName = safeSheetName(classReport.className, index);
    let sheetName = baseName;
    let duplicate = 2;

    while (usedSheetNames.has(sheetName)) {
      const suffix = ` (${duplicate})`;
      sheetName = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
      duplicate += 1;
    }

    usedSheetNames.add(sheetName);
    appendReportSheet(workbook, classReport, sheetName);
  }

  downloadWorkbook(
    workbook,
    `bao_cao_tat_ca_lop_${report.schoolYearName.replace(/\s+/g, "_")}.xlsx`,
  );
}
