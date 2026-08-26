import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { estimateCurrentWeek, TOTAL_WEEKS } from "@/lib/weeks";
import type { AttendanceStatus } from "@/types/attendance";
import { ClassWeeksPanel } from "./class-weeks-panel";

function formatSchoolYearTitle(schoolYear: string): string {
  return schoolYear.replace(/\s*-\s*/, " - ");
}

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { classId } = await params;
  const { week: weekQuery } = await searchParams;
  const supabase = await createClient();

  const { data: classItem } = await supabase
    .from("classes")
    .select("id, name, school_year")
    .eq("id", classId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!classItem) notFound();

  const estimatedWeek = estimateCurrentWeek(classItem.school_year);
  const parsedWeek = Number.parseInt(weekQuery ?? "", 10);
  const initialWeek =
    Number.isFinite(parsedWeek) && parsedWeek >= 1 && parsedWeek <= TOTAL_WEEKS
      ? parsedWeek
      : estimatedWeek;

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, student_code")
    .eq("class_id", classId)
    .is("deleted_at", null)
    .order("full_name");

  const [{ data: allAttendance }, { data: allEvaluations }, weekMetasResult] = await Promise.all([
    supabase
      .from("weekly_attendance")
      .select("student_id, week_number, status, note")
      .eq("class_id", classId),
    supabase
      .from("weekly_evaluations")
      .select("student_id, week_number, level, comment")
      .eq("class_id", classId),
    supabase
      .from("class_weeks")
      .select("week_number, start_date, end_date")
      .eq("class_id", classId),
  ]);
  const weekMetas = weekMetasResult.error ? [] : (weekMetasResult.data ?? []);

  return (
    <>
      <Link
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        href="/dashboard"
      >
        <ArrowLeft className="size-4" />
        Tất cả năm học / lớp
      </Link>

      <header className="mb-4">
        <h1 className="text-2xl font-bold">
          NĂM HỌC {formatSchoolYearTitle(classItem.school_year)}
        </h1>
        <p className="mt-2 text-xl font-bold">
          LỚP {classItem.name} ( {(students ?? []).length} Học sinh )
        </p>
      </header>

      <ClassWeeksPanel
        attendance={(allAttendance ?? []).map((row) => ({
          student_id: row.student_id,
          week_number: row.week_number,
          status: row.status as AttendanceStatus,
          note: row.note ?? "",
        }))}
        classId={classId}
        className={classItem.name}
        evaluations={allEvaluations ?? []}
        initialWeek={initialWeek}
        schoolYear={classItem.school_year}
        students={students ?? []}
        weekMetas={(weekMetas ?? []).map((row) => ({
          week_number: row.week_number,
          start_date: row.start_date,
          end_date: row.end_date,
        }))}
      />
    </>
  );
}
