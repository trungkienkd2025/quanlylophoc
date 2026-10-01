"use client";

import { useRef, useState } from "react";
import { ArrowDownUp, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  downloadColumnSortTemplate,
  downloadSortedExcel,
  sortExcelFileByThirdColumn,
} from "@/lib/excel-column-sort";

export function ExcelSorter() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasDownloadedTemplate, setHasDownloadedTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ArrayBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleImportClick() {
    setError(null);
    setMessage(null);
    if (!hasDownloadedTemplate) {
      downloadColumnSortTemplate();
      setHasDownloadedTemplate(true);
      setMessage("Đã tải file mẫu. Hãy nhập dữ liệu rồi bấm Nhập Excel lần nữa để chọn file.");
      return;
    }
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const isExcelFile = /\.(xlsx|xls)$/i.test(file.name);
    if (!isExcelFile) {
      setSelectedFile(null);
      setResult(null);
      setError("Vui lòng chọn file Excel có định dạng .xlsx hoặc .xls.");
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setMessage(null);
    setError(null);
  }

  async function handleProcess() {
    if (!selectedFile) return;
    setError(null);
    setMessage(null);
    setIsProcessing(true);
    try {
      const sortedWorkbook = sortExcelFileByThirdColumn(await selectedFile.arrayBuffer());
      setResult(sortedWorkbook);
      setMessage("Đã xử lý và sắp xếp thành công theo cột C.");
    } catch {
      setResult(null);
      setError("Không thể xử lý file Excel. Vui lòng kiểm tra lại file và thử lại.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700">
          <FileSpreadsheet className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Sắp xếp file Excel</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tải mẫu, nhập dữ liệu, rồi sắp xếp toàn bộ hàng theo cột C từ A đến Z.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Button className="h-11" onClick={handleImportClick} type="button" variant="outline">
          <Upload className="size-4" />
          Nhập Excel
        </Button>
        <Button className="h-11" disabled={!selectedFile || isProcessing} onClick={handleProcess} type="button">
          <ArrowDownUp className="size-4" />
          {isProcessing ? "Đang xử lý…" : "Xử lý"}
        </Button>
        <Button className="h-11" disabled={!result} onClick={() => result && downloadSortedExcel(result)} type="button" variant="secondary">
          <Download className="size-4" />
          Xuất Excel
        </Button>
      </div>

      <input accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} ref={fileInputRef} type="file" />

      <div aria-live="polite" className="mt-4 space-y-2 text-sm">
        <p className="text-slate-600">
          {selectedFile ? <>Đã chọn: <span className="font-semibold text-slate-900">{selectedFile.name}</span></> : "Chưa chọn file"}
        </p>
        {message && <p className="flex items-center gap-1.5 font-medium text-emerald-700"><CheckCircle2 className="size-4" />{message}</p>}
        {error && <p className="font-medium text-destructive">{error}</p>}
      </div>
    </section>
  );
}
