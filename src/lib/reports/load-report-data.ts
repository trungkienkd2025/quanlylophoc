import { getLocalDayBoundsIso, getWeekRangeLocal } from "@/lib/dates";
import { aggregateParticipationCounts } from "@/lib/participation/summary";
import { sumPointEvents } from "@/lib/points/format";
import { buildClassReport, buildStudentStatistics, buildTodayDashboard } from "@/lib/reports/aggregate";
import { getLocalRangeBoundsIso } from "@/lib/reports/range";
import type { AttendanceStatus } from "@/types/attendance";
import type { ClassDashboardStats, ClassReportData, DateRange, MultiClassReportData, ReportFilter } from "@/types/reports";
import type { SupabaseClient } from "@supabase/supabase-js";

async function fetchActiveStudents(supabase: SupabaseClient, classId: string) {
  const { data } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("class_id", classId)
    .is("deleted_at", null)
    .order("full_name");

  return data ?? [];
}

export async function loadClassDashboardStats(
  supabase: SupabaseClient,
  classId: string,
  today: string,
): Promise<ClassDashboardStats> {
  const students = await fetchActiveStudents(supabase, classId);
  const activeStudents = students.length;

  const { data: todayAttendanceRows } = await supabase
    .from("attendance")
    .select("status")
    .eq("class_id", classId)
    .eq("date", today);

  const { start: todayStart, end: todayEnd } = getLocalDayBoundsIso(today);
  const { data: participationTodayRows } = await supabase
    .from("participation_events")
    .select("student_id, points")
    .eq("class_id", classId)
    .eq("event_type", "PARTICIPATION")
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  const weekRange = getWeekRangeLocal(today);
  const { start: weekStart, end: weekEnd } = getLocalRangeBoundsIso(weekRange.start, weekRange.end);
  const { data: pointsWeekRows } = await supabase
    .from("student_points")
    .select("points")
    .eq("class_id", classId)
    .gte("created_at", weekStart)
    .lte("created_at", weekEnd);

  const participationCounts = aggregateParticipationCounts(participationTodayRows ?? []);

  return buildTodayDashboard({
    activeStudents,
    today,
    todayAttendance: (todayAttendanceRows ?? []).map((row) => ({
      status: row.status as AttendanceStatus,
    })),
    participationToday: Object.values(participationCounts).reduce((sum, count) => sum + count, 0),
    pointsThisWeek: sumPointEvents(pointsWeekRows ?? []),
  });
}

export async function loadClassReport(
  supabase: SupabaseClient,
  classId: string,
  className: string,
  filter: ReportFilter,
  range: DateRange,
): Promise<ClassReportData> {
  const students = await fetchActiveStudents(supabase, classId);

  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("student_id, date, status")
    .eq("class_id", classId)
    .gte("date", range.start)
    .lte("date", range.end);

  const { data: weeklyEvaluationRows } = await supabase
    .from("weekly_evaluations")
    .select("student_id, week_number, level")
    .eq("class_id", classId)
    .order("week_number", { ascending: false });

  return buildClassReport({
    classId,
    className,
    filter,
    range,
    students,
    attendanceRows: (attendanceRows ?? []).map((row) => ({
      student_id: row.student_id,
      date: String(row.date),
      status: row.status as AttendanceStatus,
    })),
    weeklyEvaluationRows: (weeklyEvaluationRows ?? []).map((row) => ({
      student_id: row.student_id,
      week_number: Number(row.week_number),
      level: row.level,
    })),
  });
}

export async function loadMultiClassReport(
  supabase: SupabaseClient,
  classes: Array<{ id: string; name: string }>,
  schoolYearName: string,
  filter: ReportFilter,
  range: DateRange,
): Promise<MultiClassReportData> {
  const reports = await Promise.all(
    classes.map((classItem) =>
      loadClassReport(supabase, classItem.id, classItem.name, filter, range),
    ),
  );

  return {
    schoolYearName,
    filter,
    range,
    reports,
  };
}

export async function loadStudentStatistics(
  supabase: SupabaseClient,
  classId: string,
  studentId: string,
) {
  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("status")
    .eq("class_id", classId)
    .eq("student_id", studentId);

  const { data: participationRows } = await supabase
    .from("participation_events")
    .select("points")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .eq("event_type", "PARTICIPATION");

  const { data: pointRows } = await supabase
    .from("student_points")
    .select("points")
    .eq("class_id", classId)
    .eq("student_id", studentId);

  return buildStudentStatistics({
    attendanceRows: (attendanceRows ?? []).map((row) => ({
      status: row.status as AttendanceStatus,
    })),
    participationCount: (participationRows ?? []).reduce((total, event) => total + event.points, 0),
    pointsTotal: sumPointEvents(pointRows ?? []),
  });
}
