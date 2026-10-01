import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { ExcelImportUtility } from "./excel-import-utility";

export default function UtilitiesPage() {
  return (
    <>
      <Link
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        href="/dashboard"
      >
        <ArrowLeft className="size-4" />
        Quay lại trang chủ
      </Link>

      <header className="mb-6">
        <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-rose-500 text-white">
          <FileSpreadsheet className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Tiện ích</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sắp xếp nhanh danh sách trong file Excel theo ABC.
        </p>
      </header>

      <ExcelImportUtility />
    </>
  );
}
