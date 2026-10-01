const vietnameseCollator = new Intl.Collator("vi", {
  numeric: true,
  sensitivity: "base",
});

type ExcelCellValue = string | number | boolean | Date | null | undefined;

/**
 * Keeps the first row (the spreadsheet header) in place and sorts all following
 * populated rows by the value in column C.
 */
export function sortExcelRowsByColumnC<T extends readonly ExcelCellValue[]>(
  rows: readonly T[],
): T[] {
  if (rows.length <= 2) return [...rows];

  const [header, ...dataRows] = rows;

  return [
    header,
    ...dataRows.sort((first, second) =>
      vietnameseCollator.compare(
        String(first[2] ?? "").trim(),
        String(second[2] ?? "").trim(),
      ),
    ),
  ];
}
