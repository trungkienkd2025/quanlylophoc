export type WeekRange = {
  fromWeek: number;
  toWeek: number;
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
  range: WeekRange;
  activeStudents: number;
  absentStudents: number;
  evaluations: EvaluationSummary;
};

export type MultiClassReportData = {
  schoolYearName: string;
  range: WeekRange;
  reports: ClassReportData[];
};

export type StudentStatistics = {
  attendanceRate: number | null;
  participationCount: number;
  pointsTotal: number;
  attendanceDaysRecorded: number;
};
