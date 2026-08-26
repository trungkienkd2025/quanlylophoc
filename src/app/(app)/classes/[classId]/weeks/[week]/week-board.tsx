"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveWeekBoard } from "@/app/actions/week-board";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WEEKLY_ATTENDANCE_STATUS_OPTIONS,
  toWeeklyAttendanceStatus,
  weeklyAttendanceStatusLabel,
} from "@/lib/attendance/format";
import { evaluationLevelOptions } from "@/lib/evaluations/levels";
import { downloadWeekReportExcel } from "@/lib/weeks/export-excel";
import { TOTAL_WEEKS } from "@/lib/weeks";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/attendance";

type Student = { id: string; full_name: string; student_code: string };
type AttendanceRow = { student_id: string; status: AttendanceStatus; note: string };
type EvaluationRow = { student_id: string; level: string; comment: string };

type StudentState = {
  status: AttendanceStatus;
  note: string;
  level: string;
  comment: string;
};

function emptyState(): StudentState {
  return { status: "PRESENT", note: "", level: "", comment: "" };
}

function buildStateMap(
  students: Student[],
  attendance: AttendanceRow[],
  evaluations: EvaluationRow[],
) {
  const next: Record<string, StudentState> = {};
  const attendanceMap = new Map(attendance.map((row) => [row.student_id, row]));
  const evaluationMap = new Map(evaluations.map((row) => [row.student_id, row]));
  for (const student of students) {
    const rawStatus = attendanceMap.get(student.id)?.status ?? "PRESENT";
    next[student.id] = {
      status: toWeeklyAttendanceStatus(rawStatus),
      note: attendanceMap.get(student.id)?.note ?? "",
      level: evaluationMap.get(student.id)?.level ?? "",
      comment: evaluationMap.get(student.id)?.comment ?? "",
    };
  }
  return next;
}

function statusClass(status: AttendanceStatus): string {
  return toWeeklyAttendanceStatus(status) === "PRESENT"
    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
    : "border-rose-500 bg-rose-50 text-rose-800";
}

export function WeekBoard({
  classId,
  className,
  schoolYear,
  week,
  students,
  attendance,
  evaluations,
  startDate: initialStartDate = "",
  endDate: initialEndDate = "",
  onWeekChange,
}: {
  classId: string;
  className: string;
  schoolYear: string;
  week: number;
  students: Student[];
  attendance: AttendanceRow[];
  evaluations: EvaluationRow[];
  startDate?: string;
  endDate?: string;
  onWeekChange?: (week: number) => void;
}) {
  const router = useRouter();
  const levels = useMemo(() => evaluationLevelOptions(), []);

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) =>
        a.full_name.localeCompare(b.full_name, "vi", { sensitivity: "base" }),
      ),
    [students],
  );

  const [byStudent, setByStudent] = useState(() =>
    buildStateMap(students, attendance, evaluations),
  );
  const [selectedId, setSelectedId] = useState(() => sortedStudents[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const startDate = initialStartDate;
  const endDate = initialEndDate;
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedStudents;
    return sortedStudents.filter(
      (student) =>
        student.full_name.toLowerCase().includes(q) ||
        student.student_code.toLowerCase().includes(q),
    );
  }, [query, sortedStudents]);

  const selected = sortedStudents.find((student) => student.id === selectedId) ?? null;
  const selectedState = selectedId ? byStudent[selectedId] ?? emptyState() : emptyState();

  function patchSelected(patch: Partial<StudentState>) {
    if (!selectedId) return;
    setByStudent((current) => ({
      ...current,
      [selectedId]: { ...(current[selectedId] ?? emptyState()), ...patch },
    }));
  }

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      const attendancePayload = students.map((student) => {
        const state = byStudent[student.id] ?? emptyState();
        return {
          student_id: student.id,
          status: state.status,
          note: state.note,
        };
      });
      const evaluationPayload = students.map((student) => {
        const state = byStudent[student.id] ?? emptyState();
        return {
          student_id: student.id,
          level: state.level,
          comment: state.comment,
        };
      });

      const result = await saveWeekBoard(classId, week, attendancePayload, evaluationPayload, {
        startDate,
        endDate,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.success ?? `Đã lưu tuần ${week}.`);
      router.refresh();
    });
  }

  function handleExport() {
    downloadWeekReportExcel({
      className,
      schoolYear,
      week,
      startDate,
      endDate,
      students: sortedStudents.map((student) => {
        const state = byStudent[student.id] ?? emptyState();
        return {
          student_code: student.student_code,
          full_name: student.full_name,
          status: state.status,
          level: state.level,
          comment: state.comment,
        };
      }),
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={handleExport} type="button" variant="outline">
              Xuất Excel (cả lớp)
            </Button>
            <Button disabled={isSaving} onClick={handleSave}>
              {isSaving ? "Đang lưu…" : "Lưu tuần này"}
            </Button>
          </div>
        </div>
      </div>

      {message ? <p className="text-sm text-emerald-600">✓ {message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="rounded-xl border bg-card p-3 sm:p-4">
        {students.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center text-sm text-muted-foreground">
              Lớp chưa có học sinh.{" "}
              <Link className="font-semibold text-primary underline" href={`/classes/${classId}/students`}>
                Thêm học sinh
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Label className="mb-1.5 block text-base font-bold">Học sinh</Label>
              <button
                className="flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 text-left text-sm"
                onClick={() => setPickerOpen((open) => !open)}
                type="button"
              >
                <span className="truncate">
                  {selected
                    ? `${selected.full_name} (${selected.student_code})`
                    : "Chọn học sinh ▼"}
                </span>
                <span className="text-muted-foreground">▼</span>
              </button>

              {pickerOpen ? (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-hidden rounded-lg border bg-card shadow-lg">
                  <div className="border-b p-2">
                    <Input
                      autoFocus
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Tìm theo tên hoặc mã…"
                      value={query}
                    />
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {filteredStudents.map((student) => (
                      <li key={student.id}>
                        <button
                          className={cn(
                            "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-sky-50",
                            student.id === selectedId && "bg-sky-50 text-primary",
                          )}
                          onClick={() => {
                            setSelectedId(student.id);
                            setPickerOpen(false);
                            setQuery("");
                          }}
                          type="button"
                        >
                          <span className="font-medium">{student.full_name}</span>
                          <span className="text-xs text-muted-foreground">{student.student_code}</span>
                        </button>
                      </li>
                    ))}
                    {filteredStudents.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy.</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>

            {selected ? (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{selected.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selected.student_code}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex min-h-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold",
                      statusClass(selectedState.status),
                    )}
                  >
                    {weeklyAttendanceStatusLabel(selectedState.status)}
                  </span>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold">Điểm danh</p>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKLY_ATTENDANCE_STATUS_OPTIONS.map((option) => (
                      <button
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs font-semibold",
                          toWeeklyAttendanceStatus(selectedState.status) === option.value
                            ? statusClass(option.value)
                            : "bg-background hover:bg-muted",
                        )}
                        key={option.value}
                        onClick={() => patchSelected({ status: option.value })}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold">Đánh giá</p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {levels.map((level) => (
                      <button
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          selectedState.level === level
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted",
                        )}
                        key={level}
                        onClick={() => patchSelected({ level })}
                        type="button"
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      onChange={(event) => patchSelected({ level: event.target.value })}
                      placeholder="Mức đánh giá (tuỳ chỉnh)"
                      value={selectedState.level}
                    />
                    <Input
                      onChange={(event) => patchSelected({ comment: event.target.value })}
                      placeholder="Nhận xét"
                      value={selectedState.comment}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {onWeekChange ? (
        <div className="flex justify-between gap-2">
          <Button
            disabled={week <= 1}
            onClick={() => onWeekChange(week - 1)}
            type="button"
            variant="outline"
          >
            ← Tuần trước
          </Button>
          <Button
            disabled={week >= TOTAL_WEEKS}
            onClick={() => onWeekChange(week + 1)}
            type="button"
            variant="outline"
          >
            Tuần sau →
          </Button>
        </div>
      ) : null}
    </div>
  );
}
