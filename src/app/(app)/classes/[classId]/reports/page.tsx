import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadClassReport } from "@/lib/reports/load-report-data";
import { resolveReportWeekRange } from "@/lib/reports/range";
import { createClient } from "@/lib/supabase/server";
import { ClassReportView } from "./class-report-view";
import { ReportFilters } from "./report-filters";

export default async function ClassReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ fromWeek?: string; toWeek?: string }>;
}) {
  const { classId } = await params;
  const { fromWeek, toWeek } = await searchParams;

  const range = resolveReportWeekRange(fromWeek, toWeek);
  if (!range) {
    redirect(`/classes/${classId}/reports?fromWeek=1&toWeek=35`);
  }

  const supabase = await createClient();

  const { data: classItem } = await supabase
    .from("classes")
    .select("id, name, school_year, grade")
    .eq("id", classId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!classItem) notFound();

  const report = await loadClassReport(supabase, classId, classItem.name, range);
  return (
    <>
      <Link
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        href={`/classes/${classId}`}
      >
        <ArrowLeft className="size-4" />
        Quay lại lớp {classItem.name}
      </Link>

      <header className="mb-7">
        <p className="text-sm text-muted-foreground">
          Khối {classItem.grade} · Năm học {classItem.school_year}
        </p>
        <h1 className="mt-1 text-3xl font-bold">Báo cáo — {classItem.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Tổng hợp sĩ số, chuyên cần và đánh giá học sinh
        </p>
      </header>

      <ReportFilters classId={classId} range={range} />
      <ClassReportView report={report} />
    </>
  );
}
