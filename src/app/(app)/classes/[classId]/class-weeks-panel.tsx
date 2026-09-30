"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Trash2, UserPlus } from "lucide-react";
import { WeekBoard } from "@/app/(app)/classes/[classId]/weeks/[week]/week-board";
import { StudentFormPanel } from "@/app/(app)/classes/[classId]/students/student-form-panel";
import { StudentImportPanel } from "@/app/(app)/classes/[classId]/students/student-import-panel";
import { softDeleteAllStudents } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toWeeklyAttendanceStatus } from "@/lib/attendance/format";
import { DEFAULT_EVALUATION_LEVELS } from "@/lib/evaluations/levels";
import { exportStudentsToExcel } from "@/lib/students/excel";
import { selectWeekForDate, TOTAL_WEEKS, weekLabel, weekNumbers } from "@/lib/weeks";
import type { WeekExportData } from "@/lib/weeks/export-excel";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/attendance";
import type { StudentGender } from "@/types/student";

type Student = {
  id: string;
  full_name: string;
  student_code: string;
  date_of_birth: string | null;
  gender: StudentGender;
  notes: string;
  updated_at: string;
};
type AttendanceRow = {
  student_id: string;
  week_number: number;
  status: AttendanceStatus;
  note: string;
};
type EvaluationRow = {
  student_id: string;
  week_number: number;
  level: string;
  comment: string;
};
type WeekMeta = {
  week_number: number;
  start_date: string | null;
  end_date: string | null;
};

export function ClassWeeksPanel({
  classId,
  className,
  schoolYear,
  students,
  attendance,
  evaluations,
  weekMetas,
  initialStudentId,
  initialWeek,
  autoSelectCurrentWeek,
}: {
  classId: string;
  className: string;
  schoolYear: string;
  students: Student[];
  attendance: AttendanceRow[];
  evaluations: EvaluationRow[];
  weekMetas: WeekMeta[];
  initialStudentId?: string;
  initialWeek: number;
  autoSelectCurrentWeek: boolean;
}) {
  const router = useRouter();
  const [selectedWeek, setSelectedWeek] = useState<number>(initialWeek);
  const [dateOverrides, setDateOverrides] = useState<Record<number, { start_date: string; end_date: string }>>({});
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [isStudentImportOpen, setIsStudentImportOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [studentFeedback, setStudentFeedback] = useState<string | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [isDeletingStudents, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!autoSelectCurrentWeek) return;

    // This runs in the browser so the default follows the teacher's computer date.
    setSelectedWeek(selectWeekForDate(schoolYear, weekMetas, new Date()));
  }, [autoSelectCurrentWeek, schoolYear, weekMetas]);

  const savedWeeks = useMemo(() => {
    const set = new Set<number>();
    for (const row of attendance) set.add(row.week_number);
    for (const row of evaluations) {
      if (row.level || row.comment) set.add(row.week_number);
    }
    for (const meta of weekMetas) {
      if (meta.start_date || meta.end_date) set.add(meta.week_number);
    }
    return set;
  }, [attendance, evaluations, weekMetas]);

  const weekAttendance = useMemo(
    () =>
      attendance
        .filter((row) => row.week_number === selectedWeek)
        .map((row) => ({
          student_id: row.student_id,
          status: row.status,
          note: row.note,
        })),
    [attendance, selectedWeek],
  );

  const weekEvaluations = useMemo(
    () =>
      evaluations
        .filter((row) => row.week_number === selectedWeek)
        .map((row) => ({
          student_id: row.student_id,
          level: row.level,
          comment: row.comment,
        })),
    [evaluations, selectedWeek],
  );

  const attendanceSummary = useMemo(() => {
    const activeStudentIds = new Set(students.map((student) => student.id));
    const absentStudentIds = new Set<string>();

    for (const row of weekAttendance) {
      if (!activeStudentIds.has(row.student_id)) continue;
      if (toWeeklyAttendanceStatus(row.status) !== "PRESENT") {
        absentStudentIds.add(row.student_id);
      }
    }

    const present = weekAttendance.filter(
      (row) => activeStudentIds.has(row.student_id) && toWeeklyAttendanceStatus(row.status) === "PRESENT",
    ).length;
    const absent = absentStudentIds.size;
    const unmarked = Math.max(students.length - present - absent, 0);

    return { present, absent, unmarked };
  }, [students, weekAttendance]);

  const evaluationSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const level of DEFAULT_EVALUATION_LEVELS) counts.set(level, 0);
    for (const row of weekEvaluations) {
      const level = (row.level || "").trim();
      if (!level) continue;
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 0);
  }, [weekEvaluations]);

  const meta = weekMetas.find((item) => item.week_number === selectedWeek);
  const selectedDates = dateOverrides[selectedWeek] ?? {
    start_date: meta?.start_date ?? "",
    end_date: meta?.end_date ?? "",
  };

  const exportWeeks = useMemo<WeekExportData[]>(() => {
    return Array.from({ length: selectedWeek }, (_, index) => {
      const week = index + 1;
      const weekMeta = weekMetas.find((item) => item.week_number === week);
      const dates = dateOverrides[week] ?? {
        start_date: weekMeta?.start_date ?? "",
        end_date: weekMeta?.end_date ?? "",
      };
      const attendanceByStudent = new Map(
        attendance
          .filter((row) => row.week_number === week)
          .map((row) => [row.student_id, row.status]),
      );
      const evaluationByStudent = new Map(
        evaluations
          .filter((row) => row.week_number === week)
          .map((row) => [row.student_id, row]),
      );

      return {
        week,
        startDate: dates.start_date,
        endDate: dates.end_date,
        students: students.map((student) => {
          const evaluation = evaluationByStudent.get(student.id);
          return {
            student_code: student.student_code,
            full_name: student.full_name,
            status: toWeeklyAttendanceStatus(attendanceByStudent.get(student.id) ?? "PRESENT"),
            level: evaluation?.level ?? "",
            comment: evaluation?.comment ?? "",
          };
        }),
      };
    });
  }, [attendance, dateOverrides, evaluations, selectedWeek, students, weekMetas]);

  function updateSelectedDate(field: "start_date" | "end_date", value: string) {
    setDateOverrides((current) => ({
      ...current,
      [selectedWeek]: {
        start_date: selectedDates.start_date,
        end_date: selectedDates.end_date,
        [field]: value,
      },
    }));
  }

  function handleDeleteAllStudents() {
    startDeleteTransition(async () => {
      const result = await softDeleteAllStudents(classId);

      if (result.error) {
        setStudentError(result.error);
        return;
      }

      setStudentFeedback(result.success ?? "Đã đưa toàn bộ học sinh ra khỏi lớp.");
      setStudentError(null);
      setIsDeleteAllOpen(false);
      setIsStudentFormOpen(false);
      setIsStudentImportOpen(false);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="week-grid" className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-sm font-semibold text-primary" id="week-grid">
            TUẦN {selectedWeek}/{TOTAL_WEEKS}
          </h2>
          <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="week-start">Từ ngày</Label>
              <Input
                id="week-start"
                onChange={(event) => updateSelectedDate("start_date", event.target.value)}
                type="date"
                value={selectedDates.start_date}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="week-end">Đến ngày</Label>
              <Input
                id="week-end"
                onChange={(event) => updateSelectedDate("end_date", event.target.value)}
                type="date"
                value={selectedDates.end_date}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {weekNumbers().map((week) => {
            const isSelected = selectedWeek === week;
            const hasData = savedWeeks.has(week);
            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "relative grid h-9 w-10 shrink-0 place-items-center rounded-lg border text-xs font-semibold",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card hover:bg-muted",
                )}
                key={week}
                onClick={() => setSelectedWeek(week)}
                type="button"
              >
                {week}
                {hasData && !isSelected ? (
                  <span className="absolute bottom-0.5 size-1 rounded-full bg-emerald-500" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <section className="grid gap-2 sm:grid-cols-2">
        <Card size="sm">
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">
              Điểm danh {weekLabel(selectedWeek)}
            </p>
            {weekAttendance.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Chưa lưu điểm danh tuần này.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                <li>Có mặt: {attendanceSummary.present}</li>
                <li>Vắng: {attendanceSummary.absent}</li>
                <li>Chưa điểm danh: {attendanceSummary.unmarked}</li>
              </ul>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">
              Đánh giá {weekLabel(selectedWeek)}
            </p>
            {evaluationSummary.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Chưa có đánh giá tuần này.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {evaluationSummary.map(([level, count]) => (
                  <li key={level}>
                    {level}: {count}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="add-student-heading" className="rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold" id="add-student-heading">Danh sách học sinh</h2>
            <p className="text-sm text-muted-foreground">
              Thêm học sinh mới để điểm danh và đánh giá ngay trong tuần này.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              onClick={() =>
                exportStudentsToExcel({ className, schoolYear, students })
              }
              type="button"
              variant="outline"
            >
              <Download className="size-4" />
              Xuất Excel
            </Button>
            <Button
              aria-expanded={isStudentImportOpen}
              onClick={() => {
                setIsStudentImportOpen((open) => !open);
                setStudentFeedback(null);
                setStudentError(null);
              }}
              type="button"
              variant="outline"
            >
              <FileSpreadsheet className="size-4" />
              {isStudentImportOpen ? "Đóng nhập Excel" : "Nhập Excel"}
            </Button>
            <Button
              aria-expanded={isStudentFormOpen}
              onClick={() => {
                setIsStudentFormOpen((open) => !open);
                setStudentFeedback(null);
                setStudentError(null);
              }}
              type="button"
            >
              <UserPlus className="size-4" />
              {isStudentFormOpen ? "Đóng biểu mẫu" : "Thêm học sinh"}
            </Button>
            <Button
              disabled={students.length === 0}
              onClick={() => {
                setIsDeleteAllOpen(true);
                setStudentFeedback(null);
                setStudentError(null);
              }}
              type="button"
              variant="destructive"
            >
              <Trash2 className="size-4" />
              Xóa tất cả
            </Button>
          </div>
        </div>

        {studentFeedback ? (
          <p aria-live="polite" className="mt-3 text-sm text-emerald-600">
            {studentFeedback}
          </p>
        ) : null}

        {studentError ? (
          <p aria-live="polite" className="mt-3 text-sm text-destructive">
            {studentError}
          </p>
        ) : null}

        {isStudentFormOpen ? (
          <div className="mt-4">
            <StudentFormPanel
              classId={classId}
              mode="create"
              onClose={() => setIsStudentFormOpen(false)}
              onSuccess={() => setStudentFeedback("Đã thêm học sinh vào lớp.")}
            />
          </div>
        ) : null}

        {isStudentImportOpen ? (
          <div className="mt-4">
            <StudentImportPanel
              classId={classId}
              onClose={() => setIsStudentImportOpen(false)}
              onSuccess={setStudentFeedback}
            />
          </div>
        ) : null}
      </section>

      {isDeleteAllOpen ? (
        <dialog
          aria-labelledby="delete-all-students-title"
          aria-modal="true"
          className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center bg-black/40 p-4 backdrop:bg-black/40"
          open
        >
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-lg">
            <h2 className="text-lg font-bold" id="delete-all-students-title">
              Xóa tất cả học sinh khỏi lớp?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Toàn bộ {students.length} học sinh sẽ bị đưa ra khỏi danh sách lớp {className}.
            </p>
            <p className="mt-3 text-sm font-semibold text-destructive">
              Hành động này không thể hoàn tác trên màn hình này.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                className="h-11"
                disabled={isDeletingStudents}
                onClick={() => setIsDeleteAllOpen(false)}
                type="button"
                variant="outline"
              >
                Hủy
              </Button>
              <Button
                className="h-11"
                disabled={isDeletingStudents}
                onClick={handleDeleteAllStudents}
                type="button"
                variant="destructive"
              >
                <Trash2 className="size-4" />
                {isDeletingStudents ? "Đang xóa…" : `Xóa ${students.length} học sinh`}
              </Button>
            </div>
          </div>
        </dialog>
      ) : null}

      <div className="rounded-xl border bg-background p-3 sm:p-4">
        <WeekBoard
          attendance={weekAttendance}
          classId={classId}
          className={className}
          endDate={selectedDates.end_date}
          evaluations={weekEvaluations}
          exportWeeks={exportWeeks}
          initialStudentId={initialStudentId}
          key={selectedWeek}
          onWeekChange={setSelectedWeek}
          schoolYear={schoolYear}
          startDate={selectedDates.start_date}
          students={students}
          week={selectedWeek}
        />
      </div>
    </section>
  );
}
