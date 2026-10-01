import * as XLSX from "xlsx";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const TEMPLATE_ROWS = [
  ["STT", "Mã HS", "CỘT C - NHẬP DỮ LIỆU DÙNG ĐỂ SẮP XẾP ABC", "Lớp", "Ghi chú"],
] as const;

const vietnameseCollator = new Intl.Collator("vi", {
  numeric: true,
  sensitivity: "base",
});

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isHeaderRow(sheet: XLSX.WorkSheet, row: number, range: XLSX.Range): boolean {
  const thirdColumnCell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
  const thirdColumnText = normalizeText(
    thirdColumnCell ? XLSX.utils.format_cell(thirdColumnCell) : "",
  );

  if (
    thirdColumnText.includes("cot c") ||
    thirdColumnText.includes("sap xep") ||
    thirdColumnText.includes("ho va ten")
  ) {
    return true;
  }

  let textCells = 0;
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
    const value = cell ? XLSX.utils.format_cell(cell).trim() : "";
    if (value) textCells += 1;
  }

  return textCells >= 2 && normalizeText(XLSX.utils.format_cell(thirdColumnCell ?? { t: "s", v: "" })).includes("ten");
}

type SheetRow = {
  originalIndex: number;
  sortValue: string;
  cells: Array<XLSX.CellObject | undefined>;
};

function sortWorksheetByThirdColumn(sheet: XLSX.WorkSheet): void {
  if (!sheet["!ref"]) return;

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  if (range.e.c < 2 || range.e.r <= range.s.r) return;

  const headerRow = isHeaderRow(sheet, range.s.r, range) ? range.s.r : null;
  const firstDataRow = headerRow === null ? range.s.r : headerRow + 1;
  if (firstDataRow > range.e.r) return;

  const rows: SheetRow[] = [];
  for (let row = firstDataRow; row <= range.e.r; row += 1) {
    const thirdColumnCell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
    rows.push({
      originalIndex: row,
      sortValue: thirdColumnCell ? XLSX.utils.format_cell(thirdColumnCell).trim() : "",
      cells: Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) =>
        sheet[XLSX.utils.encode_cell({ r: row, c: range.s.c + index })],
      ),
    });
  }

  rows.sort((left, right) => {
    const leftIsEmpty = !left.sortValue;
    const rightIsEmpty = !right.sortValue;
    if (leftIsEmpty && rightIsEmpty) return left.originalIndex - right.originalIndex;
    if (leftIsEmpty) return 1;
    if (rightIsEmpty) return -1;
    return vietnameseCollator.compare(left.sortValue, right.sortValue);
  });

  for (let destinationRow = firstDataRow; destinationRow <= range.e.r; destinationRow += 1) {
    const sourceRow = rows[destinationRow - firstDataRow];
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: destinationRow, c: column });
      const cell = sourceRow.cells[column - range.s.c];
      if (cell) {
        sheet[address] = cell;
      } else {
        delete sheet[address];
      }
    }
  }
}

/** Creates the blank workbook teachers fill in before uploading it again. */
export function buildColumnSortTemplateWorkbook(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS);
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 48 },
    { wch: 12 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ liệu");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

export function downloadColumnSortTemplate(): void {
  const blob = new Blob([buildColumnSortTemplateWorkbook()], { type: EXCEL_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mau_nhap_excel.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Sorts each worksheet's complete data rows by its third (C) column. */
export function sortExcelFileByThirdColumn(buffer: ArrayBuffer): ArrayBuffer {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  if (workbook.SheetNames.length === 0) {
    throw new Error("File Excel không có trang tính dữ liệu.");
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (sheet) sortWorksheetByThirdColumn(sheet);
  }

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

export function downloadSortedExcel(buffer: ArrayBuffer): void {
  const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ket_qua_da_sap_xep.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}
