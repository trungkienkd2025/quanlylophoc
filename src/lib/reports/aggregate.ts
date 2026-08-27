import { summarizeDay } from "@/lib/attendance/summary";
import type { AttendanceStatus } from "@/types/attendance";
import type { ClassReportData, DateRange, EvaluationSummary, StudentStatistics } from "@/types/reports";
import type { ReportFilter } from "@/types/reports";

type StudentRow = { id: string; full_name: string };

type WeeklyEvaluationRow = {
  student_id: string;
  week_number: number;
  level: string | null;
};

function normalizeEvaluationLevel(level: string | null | undefined): keyof EvaluationSummary | null {
  const normalized = (level ?? "").trim().toLocaleLowerCase("vi");

  if (!normalized) return null;
  if (normalized === "tốt" || normalized === "rat tot" || normalized === "rất tốt") return "good";
  if (normalized === "khá" || normalized === "kha") return "fair";
  if (normalized === "trung bình" || normalized === "trung binh") return "average";
  if (normalized === "yếu" || normalized === "yeu") return "weak";

  return null;
}

function summarizeLatestEvaluations(
  rows: WeeklyEvaluationRow[],
  activeStudentIds: Set<string>,
): EvaluationSummary {
  const latestByStudent = new Map<string, WeeklyEvaluationRow>();

  for (const row of rows) {
    const level = normalizeEvaluationLevel(row.level);
    if (!level || !activeStudentIds.has(row.student_id)) continue;

    const current = latestByStudent.get(row.student_id);
    if (!current || row.week_number > current.week_number) {
      latestByStudent.set(row.student_id, row);
    }
  }

  const summary: EvaluationSummary = { good: 0, fair: 0, average: 0, weak: 0 };
  for (const row of latestByStudent.values()) {
    const level = normalizeEvaluationLevel(row.level);
    if (level) summary[level] += 1;
  }

  return summary;
}

function countAbsentStudents(rows: { student_id: string; status: AttendanceStatus }[]): number {
  return new Set(rows.filter((row) => row.status === "ABSENT").map((row) => row.student_id)).size;
}

export function buildClassReport(input: {
  classId?: string;
  className: string;
  filter: ReportFilter;
  range: DateRange;
  students: StudentRow[];
  attendanceRows: { student_id: string; date: string; status: AttendanceStatus }[];
  weeklyEvaluationRows: WeeklyEvaluationRow[];
}): ClassReportData {
  return {
    classId: input.classId,
    className: input.className,
    filter: input.filter,
    range: input.range,
    activeStudents: input.students.length,
    absentStudents: countAbsentStudents(input.attendanceRows),
    evaluations: summarizeLatestEvaluations(
      input.weeklyEvaluationRows,
      new Set(input.students.map((student) => student.id)),
    ),
  };
}

export function buildStudentStatistics(input: {
  attendanceRows: { status: AttendanceStatus }[];
  participationCount: number;
  pointsTotal: number;
}): StudentStatistics {
  const attendanceDaysRecorded = input.attendanceRows.length;
  let attendanceRate: number | null = null;

  if (attendanceDaysRecorded > 0) {
    const attended = input.attendanceRows.filter(
      (row) => row.status === "PRESENT" || row.status === "LATE",
    ).length;
    attendanceRate = Math.round((attended / attendanceDaysRecorded) * 100);
  }

  return {
    attendanceRate,
    participationCount: input.participationCount,
    pointsTotal: input.pointsTotal,
    attendanceDaysRecorded,
  };
}

export function buildTodayDashboard(input: {
  activeStudents: number;
  today: string;
  todayAttendance: { status: AttendanceStatus }[];
  participationToday: number;
  pointsThisWeek: number;
}) {
  const summary = summarizeDay(input.today, input.todayAttendance, input.activeStudents);

  return {
    activeStudents: input.activeStudents,
    presentToday: summary.present,
    absentToday: summary.absent,
    excusedToday: summary.excused,
    lateToday: summary.late,
    participationToday: input.participationToday,
    pointsThisWeek: input.pointsThisWeek,
  };
}
