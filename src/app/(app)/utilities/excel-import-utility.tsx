"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { sortExcelRowsByNameColumn } from "@/lib/excel/sort";

const EXCEL_MIME_TYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function ExcelImportUtility() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [error, setError] = useState("");

  async function importExcelFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setError("");

    if (
      !EXCEL_MIME_TYPES.includes(selectedFile.type) &&
      !/\.xlsx?$/i.test(selectedFile.name)
    ) {
      setWorkbook(null);
      setFile(null);
      setError("Vui lòng chọn file Excel có định dạng .xlsx hoặc .xls.");
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const importedWorkbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = importedWorkbook.SheetNames[0];

      if (!firstSheetName || !importedWorkbook.Sheets[firstSheetName]) {
        throw new Error("File Excel chưa có trang tính để sắp xếp.");
      }

      setFile(selectedFile);
      setWorkbook(importedWorkbook);
    } catch {
      setWorkbook(null);
      setFile(null);
      setError("Không thể đọc file Excel. Vui lòng kiểm tra và thử lại.");
    }
  }

  function exportSortedExcel() {
    if (!workbook || !file) return;

    const sortedWorkbook = XLSX.utils.book_new();
    let foundNameColumn = false;

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(worksheet, {
        header: 1,
        defval: "",
        raw: false,
      });
      const sortedRows = sortExcelRowsByNameColumn(rows);

      if (sortedRows) {
        foundNameColumn = true;
      }

      XLSX.utils.book_append_sheet(
        sortedWorkbook,
        sortedRows ? XLSX.utils.aoa_to_sheet(sortedRows) : worksheet,
        sheetName,
      );
    });

    if (!foundNameColumn) {
      setError('Không tìm thấy cột có tiêu đề "Họ và tên" hoặc "Họ tên" để sắp xếp.');
      return;
    }

    setError("");
    const originalName = file.name.replace(/\.xlsx?$/i, "");
    XLSX.writeFile(sortedWorkbook, `${originalName}_sap_xep_ABC.xlsx`);
  }

  return (
    <Card className="max-w-2xl border-rose-100 shadow-sm">
      <CardContent className="space-y-5 py-6">
        <div>
          <h2 className="text-lg font-bold">Sắp xếp ABC</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nhập file Excel, sau đó xuất lại danh sách đã được sắp xếp theo ABC ở cột “Họ và tên” hoặc “Họ tên”.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="excel-sort-file">File Excel</Label>
          <input
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            id="excel-sort-file"
            onChange={importExcelFile}
            ref={inputRef}
            type="file"
          />
          <Button
            className="h-11"
            onClick={() => inputRef.current?.click()}
            type="button"
            variant="outline"
          >
            <Upload className="size-4" />
            Nhập file Excel
          </Button>
          {file ? (
            <p className="text-sm text-muted-foreground">Đã chọn: {file.name}</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <Button className="h-11" disabled={!workbook} onClick={exportSortedExcel} type="button">
          <Download className="size-4" />
          Xuất Excel đã sắp xếp
        </Button>
      </CardContent>
    </Card>
  );
}
