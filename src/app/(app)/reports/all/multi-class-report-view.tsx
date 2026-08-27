import { Card, CardContent } from "@/components/ui/card";
import { formatReportRangeLabel } from "@/lib/reports/range";
import type { ClassReportData, MultiClassReportData } from "@/types/reports";
import { ExportAllReportsButton } from "./export-all-reports-button";

type MultiClassReportViewProps = {
  report: MultiClassReportData;
};

export function MultiClassReportView({ report }: MultiClassReportViewProps) {
  const totals = report.reports.reduce(
    (sum, classReport) => ({
      activeStudents: sum.activeStudents + classReport.activeStudents,
      absentStudents: sum.absentStudents + classReport.absentStudents,
      good: sum.good + classReport.evaluations.good,
      fair: sum.fair + classReport.evaluations.fair,
      average: sum.average + classReport.evaluations.average,
      weak: sum.weak + classReport.evaluations.weak,
    }),
    { activeStudents: 0, absentStudents: 0, good: 0, fair: 0, average: 0, weak: 0 },
  );

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Khoảng thời gian: {formatReportRangeLabel(report.range)} · {report.reports.length} lớp
        </p>
        <ExportAllReportsButton report={report} />
      </div>

      <Card className="mb-4">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatBlock label="Tổng số học sinh" value={`${totals.activeStudents}`} />
          <StatBlock label="Số học sinh vắng" value={`${totals.absentStudents}`} />
          <StatBlock label="Số học sinh tốt" value={`${totals.good}`} />
          <StatBlock label="Số học sinh khá" value={`${totals.fair}`} />
          <StatBlock label="Số học sinh trung bình" value={`${totals.average}`} />
          <StatBlock label="Số học sinh yếu" value={`${totals.weak}`} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {report.reports.map((classReport) => (
          <ClassSummaryCard
            key={classReport.classId ?? `${classReport.className}-${classReport.range.start}`}
            report={classReport}
          />
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Khi xuất Excel, mỗi lớp sẽ nằm trong một sheet riêng và giữ cùng các thông tin đang hiển thị.
      </p>
    </>
  );
}

function ClassSummaryCard({ report }: { report: ClassReportData }) {
  return (
    <Card size="sm">
      <CardContent>
        <h2 className="mb-3 text-lg font-bold">{report.className}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatBlock label="Tổng số học sinh" value={`${report.activeStudents}`} />
          <StatBlock label="Số học sinh vắng" value={`${report.absentStudents}`} />
          <StatBlock label="Tốt" value={`${report.evaluations.good}`} />
          <StatBlock label="Khá" value={`${report.evaluations.fair}`} />
          <StatBlock label="Trung bình" value={`${report.evaluations.average}`} />
          <StatBlock label="Yếu" value={`${report.evaluations.weak}`} />
        </div>
      </CardContent>
    </Card>
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
