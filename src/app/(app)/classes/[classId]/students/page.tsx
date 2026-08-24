import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { aggregateStudentPointTotals } from "@/lib/points/format";
import { calculateLearningScoreTotal } from "@/lib/scores/calculate";
import { createClient } from "@/lib/supabase/server";
import { StudentManagement } from "./student-management";

export default async function ClassStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { classId } = await params;
  const { edit: initialEditId } = await searchParams;
  const supabase = await createClient();

  const { data: classItem } = await supabase
    .from("classes")
    .select("id, name, school_year, grade")
    .eq("id", classId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!classItem) notFound();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(
      "id, student_code, full_name, date_of_birth, gender, notes, updated_at",
    )
    .eq("class_id", classId)
    .is("deleted_at", null)
    .order("full_name")
    .order("id");

  const [
    { data: pointEvents },
    { data: semesterScores },
    { data: annualScores },
  ] = await Promise.all([
    supabase
      .from("student_points")
      .select("student_id, points")
      .eq("class_id", classId),
    supabase
      .from("semester_scores")
      .select("student_id, theory_score, practice_score")
      .eq("class_id", classId),
    supabase
      .from("annual_scores")
      .select("student_id, theory_score, practice_score")
      .eq("class_id", classId),
  ]);

  const pointTotals = aggregateStudentPointTotals(pointEvents ?? []);
  const semesterScoreTotals = Object.fromEntries(
    (semesterScores ?? []).map((score) => [
      score.student_id,
      calculateLearningScoreTotal(score.theory_score, score.practice_score),
    ]),
  );
  const annualScoreTotals = Object.fromEntries(
    (annualScores ?? []).map((score) => [
      score.student_id,
      calculateLearningScoreTotal(score.theory_score, score.practice_score),
    ]),
  );

  return (
    <>
      <Link
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        href={`/classes/${classId}`}
      >
        <ArrowLeft className="size-4" />
        Quay lại lớp {classItem.name}
      </Link>

      <header className="mb-4">
        <p className="text-xs text-muted-foreground">
          Khối {classItem.grade} · Năm học {classItem.school_year}
        </p>
        <h1 className="mt-0.5 text-2xl font-bold">
          Học sinh — {classItem.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {students?.length ?? 0} học sinh đang học
        </p>
      </header>

      {studentsError ? (
        <p className="text-sm text-destructive">
          Chưa thể tải danh sách học sinh. Vui lòng thử lại sau.
        </p>
      ) : (
        <Suspense
          fallback={<p className="text-sm text-muted-foreground">Đang tải…</p>}
        >
          <StudentManagement
            classId={classId}
            className={classItem.name}
            initialEditId={initialEditId}
            pointTotals={pointTotals}
            schoolYear={classItem.school_year}
            semesterScoreTotals={semesterScoreTotals}
            annualScoreTotals={annualScoreTotals}
            students={students ?? []}
          />
        </Suspense>
      )}
    </>
  );
}
