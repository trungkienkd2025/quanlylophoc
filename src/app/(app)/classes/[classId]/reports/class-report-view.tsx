import { Card, CardContent } from "@/components/ui/card";
import { formatReportRangeLabel } from "@/lib/reports/range";
import type { ClassReportData } from "@/types/reports";
import { ExportReportButton } from "./export-report-button";

type ClassReportViewProps = {
  report: ClassReportData;
};

export function ClassReportView({ report }: ClassReportViewProps) {
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Khoảng tuần: {formatReportRangeLabel(report.range)}
        </p>
        <ExportReportButton report={report} />
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatBlock
            label="Tổng số học sinh trong lớp"
            value={`${report.activeStudents}`}
          />
          <StatBlock
            label="Số học sinh vắng"
            value={`${report.absentStudents}`}
          />
          <StatBlock
            label="Số học sinh tốt"
            value={`${report.evaluations.good}`}
          />
          <StatBlock
            label="Số học sinh khá"
            value={`${report.evaluations.fair}`}
          />
          <StatBlock
            label="Số học sinh trung bình"
            value={`${report.evaluations.average}`}
          />
          <StatBlock
            label="Số học sinh yếu"
            value={`${report.evaluations.weak}`}
          />
        </CardContent>
      </Card>

      <p className="mt-4 text-sm text-muted-foreground">
        Các nhóm Tốt / Khá / Trung bình / Yếu được tính theo đánh giá mới nhất
        của từng học sinh trong khoảng tuần đã chọn.
      </p>
    </>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
