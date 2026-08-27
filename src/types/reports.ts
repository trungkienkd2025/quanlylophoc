export type ReportFilter = "today" | "week" | "month" | "custom";

export type DateRange = {
  start: string;
  end: string;
};

export type ClassDashboardStats = {
  activeStudents: number;
  presentToday: number;
  absentToday: number;
  excusedToday: number;
  lateToday: number;
  participationToday: number;
  pointsThisWeek: number;
};

export type EvaluationSummary = {
  good: number;
  fair: number;
  average: number;
  weak: number;
};

export type ClassReportData = {
  classId?: string;
  className: string;
  range: DateRange;
  filter: ReportFilter;
  activeStudents: number;
  absentStudents: number;
  evaluations: EvaluationSummary;
};

export type MultiClassReportData = {
  schoolYearName: string;
  range: DateRange;
  filter: ReportFilter;
  reports: ClassReportData[];
};

export type StudentStatistics = {
  attendanceRate: number | null;
  participationCount: number;
  pointsTotal: number;
  attendanceDaysRecorded: number;
};
