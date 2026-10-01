const vietnameseCollator = new Intl.Collator("vi", {
  numeric: true,
  sensitivity: "base",
});

type ExcelCellValue = string | number | boolean | Date | null | undefined;

type ExcelRow = readonly ExcelCellValue[];

export type ExcelNameColumnSortTarget = {
  columnIndex: number;
  headerRowIndex: number;
};

function normalizeHeader(value: ExcelCellValue): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

/** Finds a column headed "Họ và tên" or "Họ tên", ignoring case and accents. */
export function findExcelNameColumn(rows: readonly ExcelRow[]): ExcelNameColumnSortTarget | null {
  for (const [headerRowIndex, row] of rows.entries()) {
    const columnIndex = row.findIndex((cell) => {
      const header = normalizeHeader(cell);
      return header === "ho va ten" || header === "ho ten";
    });

    if (columnIndex !== -1) return { columnIndex, headerRowIndex };
  }

  return null;
}

/**
 * Keeps all rows through the name-column header in place, then sorts the rows
 * below it using Vietnamese alphabetical order. Returns null when no name
 * column can be identified so the caller does not export an incorrectly sorted file.
 */
export function sortExcelRowsByNameColumn<T extends ExcelRow>(
  rows: readonly T[],
): T[] | null {
  const target = findExcelNameColumn(rows);
  if (!target) return null;

  const rowsBeforeData = rows.slice(0, target.headerRowIndex + 1);
  const dataRows = rows.slice(target.headerRowIndex + 1);

  return [
    ...rowsBeforeData,
    ...dataRows.toSorted((first, second) =>
      vietnameseCollator.compare(
        String(first[target.columnIndex] ?? "").trim(),
        String(second[target.columnIndex] ?? "").trim(),
      ),
    ),
  ];
}

/**
 * Legacy helper for files whose name column is known to be column C and whose
 * header is the first row.
 */
export function sortExcelRowsByColumnC<T extends ExcelRow>(rows: readonly T[]): T[] {
  if (rows.length <= 2) return [...rows];

  const [header, ...dataRows] = rows;
  return [
    header,
    ...dataRows.toSorted((first, second) =>
      vietnameseCollator.compare(String(first[2] ?? "").trim(), String(second[2] ?? "").trim()),
    ),
  ];
}
