import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLocalDateString } from "@/lib/dates";
import { loadMultiClassReport } from "@/lib/reports/load-report-data";
import { parseReportFilter, resolveReportRange } from "@/lib/reports/range";
import { sortBySchoolYearNameDesc } from "@/lib/school-years";
import { createClient } from "@/lib/supabase/server";
import { ReportFilters } from "../../classes/[classId]/reports/report-filters";
import { MultiClassReportView } from "./multi-class-report-view";

type YearMenuItem = {
  id: string;
  name: string;
};

export default async function AllReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; filter?: string; from?: string; to?: string }>;
}) {
  const { year: selectedYearParam, filter: filterParam, from, to } = await searchParams;
  const today = getLocalDateString();
  const filter = parseReportFilter(filterParam);
  const range = resolveReportRange(filter, { today, from, to });

  if (!range) {
    const yearQuery = selectedYearParam ? `&year=${encodeURIComponent(selectedYearParam)}` : "";
    redirect(`/reports/all?filter=today${yearQuery}`);
  }

  const supabase = await createClient();
  const [{ data: schoolYears }, { data: classes }] = await Promise.all([
    supabase.from("school_years").select("id, name").is("deleted_at", null),
    supabase
      .from("classes")
      .select("id, name, school_year, school_year_id, grade")
      .is("deleted_at", null)
      .order("name"),
  ]);

  const yearsFromDb: YearMenuItem[] = (schoolYears ?? []).map((year) => ({
    id: year.id,
    name: year.name,
  }));
  const orphanYears = Array.from(
    new Map(
      (classes ?? [])
        .filter(
          (classItem) =>
            !classItem.school_year_id ||
            !yearsFromDb.some((year) => year.id === classItem.school_year_id),
        )
        .map((classItem) => [
          classItem.school_year,
          { id: classItem.school_year, name: classItem.school_year },
        ]),
    ).values(),
  );
  const years = sortBySchoolYearNameDesc([...yearsFromDb, ...orphanYears]);
  const selectedYear = years.find((year) => year.id === selectedYearParam) ?? years[0];

  if (!selectedYear) notFound();

  const visibleClasses = (classes ?? []).filter(
    (classItem) =>
      classItem.school_year_id === selectedYear.id ||
      (!classItem.school_year_id && classItem.school_year === selectedYear.name) ||
      classItem.school_year === selectedYear.name,
  );

  const report = await loadMultiClassReport(
    supabase,
    visibleClasses.map((classItem) => ({ id: classItem.id, name: classItem.name })),
    selectedYear.name,
    filter,
    range,
  );

  return (
    <>
      <Link
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        href={`/reports?year=${encodeURIComponent(selectedYear.id)}`}
      >
        <ArrowLeft className="size-4" />
        Quay lại chọn lớp báo cáo
      </Link>

      <header className="mb-7">
        <p className="text-sm text-muted-foreground">Năm học {selectedYear.name}</p>
        <h1 className="mt-1 text-3xl font-bold">Báo cáo — Tất cả lớp</h1>
        <p className="mt-2 text-muted-foreground">
          Tổng hợp sĩ số, chuyên cần và đánh giá của tất cả lớp bạn dạy trong năm học này.
        </p>
      </header>

      <ReportFilters
        basePath={`/reports/all?year=${encodeURIComponent(selectedYear.id)}`}
        filter={filter}
        range={range}
      />
      <MultiClassReportView report={report} />
    </>
  );
}
