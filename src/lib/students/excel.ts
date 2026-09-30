import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { ExcelStudentRow } from "@/types/student";
import { EXCEL_IMPORT_LIMITS, validateImportRowCount } from "@/lib/students/import-limits";
import { formatDateVi, genderLabel } from "@/lib/students/format";
import { sortStudents } from "@/lib/students/sort";
import type { StudentGender } from "@/types/student";

const TEMPLATE_HEADERS = [
  "Mã học sinh",
  "Họ và tên",
  "Ngày sinh",
  "Giới tính",
  "Ghi chú",
] as const;

type StudentExcelExportRow = {
  student_code: string;
  full_name: string;
  date_of_birth: string | null;
  gender: StudentGender;
  notes?: string;
};

function sanitizeFilenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function displayGender(gender: StudentGender) {
  return gender === "UNSPECIFIED" ? "" : genderLabel(gender);
}

function displayBirthDate(dateOfBirth: string | null) {
  return dateOfBirth ? formatDateVi(dateOfBirth) : "";
}

export function exportStudentsToExcel(input: {
  className: string;
  schoolYear: string;
  students: StudentExcelExportRow[];
}): void {
  const sortedStudents = sortStudents(input.students, "name");
  const data = [
    [
      "STT",
      "Họ và tên",
      "Giới tính",
      "Ngày tháng năm sinh",
      "Dân tộc",
      "Mã học sinh",
      "Ghi chú",
    ],
    ...sortedStudents.map((student, index) => [
      index + 1,
      student.full_name,
      displayGender(student.gender),
      displayBirthDate(student.date_of_birth),
      "",
      student.student_code,
      student.notes ?? "",
    ]),
    [],
    [`Sĩ số: ${sortedStudents.length} học sinh`, "", "", "", "", "", ""],
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:F1");

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      if (!cell) continue;
      cell.s = {
        font: { name: "Times New Roman", sz: 13, bold: row === 0 },
        fill:
          row === 0
            ? { fgColor: { rgb: "D9EAF7" }, patternType: "solid" }
            : undefined,
        alignment: {
          horizontal:
            row === 0 || [0, 2, 3, 4, 5].includes(col) ? "center" : "left",
          vertical: "center",
        },
        border:
          row <= sortedStudents.length
            ? {
                top: { style: "thin", color: { rgb: "808080" } },
                bottom: { style: "thin", color: { rgb: "808080" } },
                left: { style: "thin", color: { rgb: "808080" } },
                right: { style: "thin", color: { rgb: "808080" } },
              }
            : undefined,
      };
    }
  }

  sheet["!cols"] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, "Danh sách học sinh");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(
    blob,
    `Danh_sach_hoc_sinh_${sanitizeFilenamePart(input.className)}_${sanitizeFilenamePart(input.schoolYear)}.xlsx`,
  );
}

const HEADER_ALIASES: Record<string, string[]> = {
  student_code: ["student_code", "mã_học_sinh", "ma_hoc_sinh", "mã_hs", "ma_hs"],
  full_name: ["full_name", "họ_và_tên", "ho_va_ten", "họ_tên", "ho_ten"],
  date_of_birth: [
    "date_of_birth",
    "ngày_sinh",
    "ngay_sinh",
    "ngày_tháng_năm_sinh",
    "ngay_thang_nam_sinh",
  ],
  gender: ["gender", "giới_tính", "gioi_tinh"],
  notes: ["notes", "ghi_chú", "ghi_chu"],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).trim();
}

export function buildStudentTemplateWorkbook(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS]]);
  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 32 },
    { wch: 16 },
    { wch: 14 },
    { wch: 40 },
  ];

  const guide = XLSX.utils.aoa_to_sheet([
    ["HƯỚNG DẪN NHẬP DANH SÁCH HỌC SINH"],
    ["1. Điền thông tin học sinh vào trang tính Danh sách học sinh."],
    ["2. Mã học sinh và Họ và tên là bắt buộc."],
    ["3. Ngày sinh dùng định dạng YYYY-MM-DD hoặc DD/MM/YYYY."],
    ["4. Giới tính: Nam, Nữ, Khác hoặc để trống."],
    ["5. Không đổi tên các cột ở dòng đầu tiên."],
  ]);
  guide["!cols"] = [{ wch: 90 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách học sinh");
  XLSX.utils.book_append_sheet(workbook, guide, "Hướng dẫn");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

export function downloadStudentTemplate(): void {
  const buffer = buildStudentTemplateWorkbook();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mau_danh_sach_hoc_sinh.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseStudentExcelFile(buffer: ArrayBuffer): ExcelStudentRow[] {
  if (buffer.byteLength > EXCEL_IMPORT_LIMITS.maxFileSizeBytes) {
    throw new Error("File quá lớn. Kích thước tối đa là 2 MB.");
  }

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    sheetRows: EXCEL_IMPORT_LIMITS.maxSheetRows,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("File Excel không có sheet dữ liệu.");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (matrix.length < 2) {
    throw new Error("File Excel chưa có dòng dữ liệu học sinh.");
  }

  if ((matrix[0]?.length ?? 0) > EXCEL_IMPORT_LIMITS.maxColumns) {
    throw new Error("File có quá nhiều cột. Vui lòng dùng file mẫu.");
  }

  const headerRow = matrix[0].map(normalizeHeader);
  const findColumn = (field: keyof typeof HEADER_ALIASES) =>
    headerRow.findIndex((header) => HEADER_ALIASES[field].includes(header));
  const columnIndex = {
    studentCode: findColumn("student_code"),
    fullName: findColumn("full_name"),
    dateOfBirth: findColumn("date_of_birth"),
    gender: findColumn("gender"),
    notes: findColumn("notes"),
  };

  if (columnIndex.studentCode === -1 || columnIndex.fullName === -1) {
    throw new Error("File thiếu cột bắt buộc: Mã học sinh, Họ và tên.");
  }

  const rows: ExcelStudentRow[] = [];

  for (let index = 1; index < matrix.length; index += 1) {
    const row = matrix[index];
    const values = [
      columnIndex.studentCode >= 0 ? cellToString(row[columnIndex.studentCode]) : "",
      columnIndex.fullName >= 0 ? cellToString(row[columnIndex.fullName]) : "",
      columnIndex.dateOfBirth >= 0 ? cellToString(row[columnIndex.dateOfBirth]) : "",
      columnIndex.gender >= 0 ? cellToString(row[columnIndex.gender]) : "",
      columnIndex.notes >= 0 ? cellToString(row[columnIndex.notes]) : "",
    ];

    const isEmpty = values.every((value) => !value);
    if (isEmpty) continue;

    rows.push({
      rowNumber: index + 1,
      studentCode: values[0],
      fullName: values[1],
      dateOfBirth: values[2],
      gender: values[3],
      notes: values[4],
    });
  }

  const rowCountError = validateImportRowCount(rows.length);
  if (rowCountError) {
    throw new Error(rowCountError);
  }

  return rows;
}
