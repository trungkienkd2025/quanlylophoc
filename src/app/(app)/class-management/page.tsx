import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, GraduationCap, UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CreateClassForm } from "../dashboard/create-class-form";
import { CreateSchoolYearForm } from "../dashboard/create-school-year-form";
import { DeleteSchoolYearButton } from "../dashboard/delete-school-year-button";
import { estimateCurrentWeek, TOTAL_WEEKS, weekLabel } from "@/lib/weeks";
import {
  currentSchoolYearName,
  sortBySchoolYearNameDesc,
} from "@/lib/school-years";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/supabase/errors";

type ClassRow = {
  id: string;
  name: string;
  school_year: string;
  grade: number;
  school_year_id: string | null;
};

const CLASS_CARD_GRADE_BACKGROUNDS: Record<number, string> = {
  1: "bg-[#fff4ec]",
  2: "bg-[#f5f0ff]",
  3: "bg-[#eef8ff]",
  4: "bg-[#fff9e6]",
  5: "bg-[#f0fbf3]",
};

const CLASS_CARD_FALLBACK_BACKGROUNDS = [
  "bg-[#eef8ff]",
  "bg-[#fff9e6]",
  "bg-[#f0fbf3]",
  "bg-[#f5f0ff]",
  "bg-[#fff4ec]",
] as const;

function getClassCardBackground(grade: number) {
  return (
    CLASS_CARD_GRADE_BACKGROUNDS[grade] ??
    CLASS_CARD_FALLBACK_BACKGROUNDS[
      Math.abs(grade) % CLASS_CARD_FALLBACK_BACKGROUNDS.length
    ]
  );
}

export const metadata: Metadata = {
  title: "Quản lý lớp học — QLLH",
  description: "Quản lý năm học, lớp học và học sinh",
};

export default async function ClassManagementPage() {
  const supabase = await createClient();
  const { data: schoolYears, error: yearsError } = await supabase
    .from("school_years")
    .select("id, name")
    .is("deleted_at", null);

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, school_year, grade, school_year_id")
    .is("deleted_at", null)
    .order("name");

  const classIds = classes?.map((item) => item.id) ?? [];
  const { data: activeStudents } =
    classIds.length > 0
      ? await supabase
          .from("students")
          .select("class_id")
          .is("deleted_at", null)
          .in("class_id", classIds)
      : { data: [] as { class_id: string }[] };

  const studentCountByClass = (activeStudents ?? []).reduce<
    Record<string, number>
  >((counts, student) => {
    counts[student.class_id] = (counts[student.class_id] ?? 0) + 1;
    return counts;
  }, {});

  const persistedYearIds = new Set((schoolYears ?? []).map((year) => year.id));
  const yearsFromDb = (schoolYears ?? []).map((year) => ({
    id: year.id,
    name: year.name,
  }));
  const orphanNames = Array.from(
    new Set(
      (classes ?? [])
        .filter(
          (classItem) =>
            !classItem.school_year_id ||
            !yearsFromDb.some((year) => year.id === classItem.school_year_id),
        )
        .map((classItem) => classItem.school_year)
        .filter(Boolean),
    ),
  ).map((name) => ({ id: name, name }));

  const years = sortBySchoolYearNameDesc([...yearsFromDb, ...orphanNames]);

  const classesByYear = (classes ?? []).reduce<Record<string, ClassRow[]>>(
    (groups, classItem) => {
      const key = classItem.school_year_id ?? classItem.school_year;
      groups[key] = groups[key] ?? [];
      groups[key].push(classItem as ClassRow);
      return groups;
    },
    {},
  );

  const loadError =
    yearsError || classesError
      ? mapDatabaseError(
          yearsError ?? classesError,
          "Chưa thể tải danh sách. Vui lòng thử lại sau.",
        )
      : null;

  const currentYearName = currentSchoolYearName();
  const currentYear = years.find((year) => year.name === currentYearName);
  const currentYearClasses = currentYear
    ? (classesByYear[currentYear.id] ?? classesByYear[currentYear.name] ?? [])
    : (classes ?? []).filter(
        (classItem) => classItem.school_year === currentYearName,
      );
  const currentYearStudentCount = currentYearClasses.reduce(
    (sum, classItem) => sum + (studentCountByClass[classItem.id] ?? 0),
    0,
  );

  return (
    <>
      <Link
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        href="/dashboard"
      >
        <ArrowLeft className="size-4" />
        Trang chủ
      </Link>

      <header className="mb-4">
        <p className="text-xs text-muted-foreground">Khu vực quản lý</p>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý lớp học</h1>
      </header>

      <section className="mb-5 grid gap-2 sm:grid-cols-3">
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Năm học hiện tại</p>
            <p className="mt-1 text-lg font-bold">{currentYearName ?? "—"}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Tổng số lớp</p>
            <p className="mt-1 text-lg font-bold">
              {currentYearClasses.length}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Tổng học sinh</p>
            <p className="mt-1 text-lg font-bold">{currentYearStudentCount}</p>
          </CardContent>
        </Card>
      </section>

      {loadError ? (
        <Card>
          <CardContent className="text-muted-foreground">
            {loadError}
          </CardContent>
        </Card>
      ) : years.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-6 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-sky-100 text-primary">
              <GraduationCap className="size-5" />
            </div>
            <h3 className="mt-3 text-base font-bold">Chưa có năm học</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Thêm năm học trước, rồi tạo lớp trong năm đó.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div id="danh-sach-lop-hoc" className="space-y-8">
          {years.map((year) => {
            const yearClasses =
              classesByYear[year.id] ?? classesByYear[year.name] ?? [];
            const currentWeek = estimateCurrentWeek(year.name);
            return (
              <section aria-labelledby={`year-${year.id}`} key={year.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold" id={`year-${year.id}`}>
                      {year.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      TUẦN HIỆN TẠI {currentWeek}/{TOTAL_WEEKS}
                    </p>
                  </div>
                  {persistedYearIds.has(year.id) ? (
                    <DeleteSchoolYearButton
                      classCount={yearClasses.length}
                      schoolYearId={year.id}
                      schoolYearName={year.name}
                    />
                  ) : null}
                </div>

                <div className="mb-3">
                  <CreateClassForm compact lockedSchoolYear={year.name} />
                </div>

                {yearClasses.length === 0 ? (
                  <Card>
                    <CardContent className="py-4 text-center text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Chưa có lớp nào.
                      </p>
                      <p className="mt-1">Hãy tạo lớp đầu tiên.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {yearClasses.map((classItem) => {
                      const studentsCount =
                        studentCountByClass[classItem.id] ?? 0;
                      const week = estimateCurrentWeek(classItem.school_year);
                      return (
                        <Link
                          href={`/classes/${classItem.id}`}
                          key={classItem.id}
                        >
                          <Card
                            className={`${getClassCardBackground(
                              classItem.grade,
                            )} h-full transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md`}
                            size="sm"
                          >
                            <CardContent>
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-lg font-bold text-primary">
                                    {classItem.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Khối {classItem.grade}
                                  </p>
                                </div>
                                <GraduationCap className="size-5 text-sky-500" />
                              </div>
                              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
                                <UsersRound className="size-3.5" />
                                {studentsCount} học sinh
                              </div>
                              <p className="mt-1.5 text-xs text-muted-foreground">
                                {weekLabel(week)} / {TOTAL_WEEKS}
                              </p>
                              <p className="mt-2 text-xs font-semibold text-primary">
                                Mở lớp →
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <CreateSchoolYearForm existingYears={years.map((year) => year.name)} />
    </>
  );
}
