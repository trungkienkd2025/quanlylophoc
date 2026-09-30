"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import {
  importStudents,
  validateImportRows,
  type ActionState,
} from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import { downloadStudentTemplate, parseStudentExcelFile } from "@/lib/students/excel";
import { EXCEL_IMPORT_LIMITS, validateExcelUploadFile } from "@/lib/students/import-limits";
import { formatDateVi, genderLabel } from "@/lib/students/format";
import { parseGenderInput } from "@/lib/students/validation";
import type { ExcelRowValidation } from "@/types/student";

type StudentImportPanelProps = {
  classId: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export function StudentImportPanel({ classId, onClose, onSuccess }: StudentImportPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ExcelRowValidation[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importState, setImportState] = useState<ActionState>({});
  const [isParsing, startParseTransition] = useTransition();
  const [isImporting, startImportTransition] = useTransition();

  const hasErrors = rows.some((row) => !row.isValid);
  const canImport = rows.length > 0 && !hasErrors;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setImportState({});

    const uploadError = validateExcelUploadFile(file);
    if (uploadError) {
      setFileError(uploadError);
      event.target.value = "";
      return;
    }

    startParseTransition(async () => {
      try {
        const buffer = await file.arrayBuffer();
        const parsedRows = parseStudentExcelFile(buffer);
        const validated = await validateImportRows(classId, parsedRows.map((row) => ({
          ...row,
          errors: [],
          isValid: true,
        })));
        setRows(validated);
      } catch (error) {
        setRows([]);
        setFileError(error instanceof Error ? error.message : "Không thể đọc file Excel.");
      } finally {
        event.target.value = "";
      }
    });
  }

  function handleImport() {
    if (!canImport) return;

    startImportTransition(async () => {
      const result = await importStudents(classId, rows);
      setImportState(result);
      if (result.success) {
        router.refresh();
        onSuccess?.(result.success);
        onClose();
      }
    });
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Nhập danh sách học sinh</h2>
        <Button onClick={onClose} type="button" variant="ghost">
          Đóng
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="h-11 flex-1"
          onClick={downloadStudentTemplate}
          type="button"
          variant="outline"
        >
          <Download className="size-4" />
          Xuất file mẫu
        </Button>
        <Button
          className="h-11 flex-1"
          disabled={isParsing}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Upload className="size-4" />
          {isParsing ? "Đang đọc file…" : "Nhập file mẫu"}
        </Button>
        <input
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Cột bắt buộc: Mã học sinh, Họ và tên. Tối đa{" "}
        {EXCEL_IMPORT_LIMITS.maxRows} học sinh, file tối đa 2 MB (.xlsx hoặc .xls). Bạn có thể dùng file đã xuất từ lớp này để thêm học sinh mới.
      </p>

      {fileError && (
        <p aria-live="polite" className="mt-3 text-sm text-destructive">
          {fileError}
        </p>
      )}
      {importState.error && (
        <p aria-live="polite" className="mt-3 text-sm text-destructive">
          {importState.error}
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Dòng</th>
                  <th className="px-3 py-2 font-semibold">Mã HS</th>
                  <th className="px-3 py-2 font-semibold">Họ tên</th>
                  <th className="hidden px-3 py-2 font-semibold md:table-cell">Ngày sinh</th>
                  <th className="hidden px-3 py-2 font-semibold lg:table-cell">Giới tính</th>
                  <th className="px-3 py-2 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const gender = parseGenderInput(String(row.gender));
                  return (
                    <tr className="border-t align-top" key={row.rowNumber}>
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2">{row.studentCode || "—"}</td>
                      <td className="px-3 py-2">{row.fullName || "—"}</td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        {row.dateOfBirth ? formatDateVi(String(row.dateOfBirth)) : "—"}
                      </td>
                      <td className="hidden px-3 py-2 lg:table-cell">
                        {gender ? genderLabel(gender) : row.gender || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.isValid && row.alreadyInClass ? (
                          <span className="font-medium text-muted-foreground">Đã có trong lớp</span>
                        ) : row.isValid ? (
                          <span className="font-medium text-emerald-600">✓ Hợp lệ</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="font-medium text-destructive">✗ Có lỗi</span>
                            <ul className="list-disc pl-4 text-xs text-destructive">
                              {row.errors.map((error) => (
                                <li key={error}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasErrors ? (
            <p className="mt-3 text-sm text-destructive">
              File có lỗi. Vui lòng sửa file Excel và tải lại trước khi nhập.
            </p>
          ) : (
            <p className="mt-3 text-sm text-emerald-600">
              Tất cả {rows.length} dòng hợp lệ. Học sinh đã có trong lớp sẽ được giữ nguyên; chỉ thêm học sinh mới.
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <Button
              className="h-11"
              disabled={!canImport || isImporting}
              onClick={handleImport}
              type="button"
            >
              <FileSpreadsheet className="size-4" />
              {isImporting ? "Đang nhập…" : `Nhập ${rows.length} học sinh`}
            </Button>
            <Button className="h-11" onClick={onClose} type="button" variant="outline">
              Huỷ
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
