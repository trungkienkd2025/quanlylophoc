import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { attendanceStatusLabel } from "@/lib/attendance/format";
import { formatDateTimeVi, formatDateVi, genderLabel } from "@/lib/students/format";
import { createClient } from "@/lib/supabase/server";
import { weekLabel, weekNumbers } from "@/lib/weeks";
import type { AttendanceStatus } from "@/types/attendance";

function formatScore(value: number | string | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

function calculateDisplayTotal(
  theory: number | string | null | undefined,
  practice: number | string | null | undefined,
) {
  if (theory == null || theory === "" || practice == null || practice === "") return "—";

  const theoryScore = Number(theory);
  const practiceScore = Number(practice);
  if (!Number.isFinite(theoryScore) || !Number.isFinite(practiceScore)) return "—";

  return String(Math.ceil(theoryScore + practiceScore));
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  const { classId, studentId } = await params;
  const supabase = await createClient();

  const { data: classItem } = await supabase
    .from("classes")
    .select("id, name, school_year, grade")
    .eq("id", classId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!classItem) notFound();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, class_id, student_code, full_name, date_of_birth, gender, notes, created_at, updated_at",
    )
    .eq("id", studentId)
    .eq("class_id", classId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!student) notFound();

  const [{ data: weeklyAttendance }, { data: weeklyEvaluations }, { data: semester }, { data: annual }] =
    await Promise.all([
      supabase
        .from("weekly_attendance")
        .select("week_number, status")
        .eq("class_id", classId)
        .eq("student_id", studentId),
      supabase
        .from("weekly_evaluations")
        .select("week_number, level, comment")
        .eq("class_id", classId)
        .eq("student_id", studentId),
      supabase
        .from("semester_scores")
        .select("theory_score, practice_score, total_score")
        .eq("student_id", studentId)
        .maybeSingle(),
      supabase
        .from("annual_scores")
        .select("theory_score, practice_score, total_score")
        .eq("student_id", studentId)
        .maybeSingle(),
    ]);

  const attendanceCounts = { PRESENT: 0, EXCUSED: 0, ABSENT: 0, LATE: 0 };
  for (const row of weeklyAttendance ?? []) {
    const status = row.status as AttendanceStatus;
    if (status in attendanceCounts) attendanceCounts[status] += 1;
  }

  const evaluationByWeek = new Map(
    (weeklyEvaluations ?? []).map((row) => [row.week_number, row] as const),
  );
  const attendanceByWeek = new Map(
    (weeklyAttendance ?? []).map((row) => [row.week_number, row.status as AttendanceStatus] as const),
  );

  return (
    <>
      <Link
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        href={`/classes/${classId}/students`}
      >
        <ArrowLeft className="size-4" />
        Danh sách học sinh
      </Link>

      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {classItem.school_year} · {classItem.name} · Khối {classItem.grade}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{student.full_name}</h1>
          <p className="mt-2 text-muted-foreground">Mã học sinh: {student.student_code}</p>
        </div>
        <Link
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          href={`/classes/${classId}/students?edit=${student.id}`}
        >
          <Pencil className="size-4" />
          Sửa thông tin
        </Link>
      </header>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <DetailField label="Họ tên" value={student.full_name} />
          <DetailField label="Mã học sinh" value={student.student_code} />
          <DetailField label="Ngày sinh" value={formatDateVi(student.date_of_birth)} />
          <DetailField label="Giới tính" value={genderLabel(student.gender)} />
          <DetailField label="Lớp" value={classItem.name} />
          <DetailField label="Ngày thêm" value={formatDateTimeVi(student.created_at)} />
          <div className="space-y-1 sm:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Ghi chú</p>
            <p className="text-base">{student.notes || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="Có mặt" value={String(attendanceCounts.PRESENT)} />
          <DetailField label="Vắng có phép" value={String(attendanceCounts.EXCUSED)} />
          <DetailField label="Vắng" value={String(attendanceCounts.ABSENT)} />
          <DetailField label="Đi muộn" value={String(attendanceCounts.LATE)} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Đánh giá theo tuần</p>
          <div className="space-y-2">
            {weekNumbers().map((week) => {
              const evaluation = evaluationByWeek.get(week);
              const status = attendanceByWeek.get(week);
              if (!evaluation && !status) return null;
              return (
                <div
                  className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                  key={week}
                >
                  <span className="font-medium">{weekLabel(week)}</span>
                  <span>{status ? attendanceStatusLabel(status) : "—"}</span>
                  <span className="sm:text-right">
                    {evaluation?.level || "—"}
                    {evaluation?.comment ? ` · ${evaluation.comment}` : ""}
                  </span>
                </div>
              );
            })}
            {(weeklyAttendance?.length ?? 0) === 0 && (weeklyEvaluations?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu theo tuần.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-muted-foreground">Học kỳ 1</p>
            <DetailField label="Lý thuyết" value={formatScore(semester?.theory_score)} />
            <DetailField label="Thực hành" value={formatScore(semester?.practice_score)} />
            <DetailField
              label="Tổng"
              value={calculateDisplayTotal(semester?.theory_score, semester?.practice_score)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-muted-foreground">Cuối năm</p>
            <DetailField label="Lý thuyết" value={formatScore(annual?.theory_score)} />
            <DetailField label="Thực hành" value={formatScore(annual?.practice_score)} />
            <DetailField
              label="Tổng"
              value={calculateDisplayTotal(annual?.theory_score, annual?.practice_score)}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-medium">{value}</p>
    </div>
  );
}
