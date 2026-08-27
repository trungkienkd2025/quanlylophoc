"use client";

import { Button } from "@/components/ui/button";
import { downloadMultiClassEvaluationReportExcel } from "@/lib/reports/export-excel";
import type { MultiClassReportData } from "@/types/reports";

type ExportAllReportsButtonProps = {
  report: MultiClassReportData;
};

export function ExportAllReportsButton({ report }: ExportAllReportsButtonProps) {
  return (
    <Button
      disabled={!report.reports.length}
      onClick={() => downloadMultiClassEvaluationReportExcel(report)}
      type="button"
    >
      Xuất Excel tất cả lớp
    </Button>
  );
}
