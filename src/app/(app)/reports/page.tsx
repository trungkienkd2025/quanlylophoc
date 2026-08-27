import { ReportClassSelect } from "./report-class-select";
import { ReportYearSelect } from "./report-year-select";
import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { sortBySchoolYearNameDesc } from "@/lib/school-years";
import { createClient } from "@/lib/supabase/server";

type YearMenuItem = {
  id: string;
  name: string;
};

export default async function ReportsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: selectedYearParam } = await searchParams;
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
  const selectedYear =
    years.find((year) => year.id === selectedYearParam) ?? years[0];

  const visibleClasses = selectedYear
    ? (classes ?? []).filter(
        (classItem) =>
          classItem.school_year_id === selectedYear.id ||
          (!classItem.school_year_id &&
            classItem.school_year === selectedYear.name) ||
          classItem.school_year === selectedYear.name,
      )
    : [];

  return (
    <>
      <header className="mb-4">
        <p className="text-sm text-muted-foreground">Tổng hợp</p>
        <h1 className="text-2xl font-bold">Báo cáo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn năm học đã tạo, rồi chọn lớp để xem báo cáo chuyên cần / phát
          biểu / điểm thi đua.
        </p>
      </header>

      {!years.length ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Chưa có năm học để xem báo cáo. Hãy tạo năm học và lớp trước.
          </CardContent>
        </Card>
      ) : (
        <>
          <ReportYearSelect
            selectedYearId={selectedYear?.id ?? ""}
            years={years}
          />

          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                Năm học {selectedYear?.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {visibleClasses.length} lớp có thể xem báo cáo trong năm học
                này.
              </p>
            </div>
          </div>

          {!visibleClasses.length ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Chưa có lớp nào trong năm học này để xem báo cáo.
              </CardContent>
            </Card>
          ) : (
            <Card size="sm">
              <CardContent>
                <ReportClassSelect
                  allReportsHref={`/reports/all?year=${encodeURIComponent(selectedYear?.id ?? "")}`}
                  classes={visibleClasses}
                />
                <p className="text-xs text-muted-foreground">
                  Các lớp trong cùng năm học được gom vào một menu để màn hình
                  gọn hơn.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card className="mt-4" size="sm">
        <CardContent className="flex items-start gap-3">
          <GraduationCap className="mt-0.5 size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Báo cáo tuần (điểm danh + đánh giá) nằm trong từng lớp → chọn tuần →
            Xuất Excel.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
