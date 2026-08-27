"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

type ReportClassSelectProps = {
  allReportsHref: string;
  classes: Array<{
    id: string;
    name: string;
    grade: number;
    school_year: string;
  }>;
};

export function ReportClassSelect({ allReportsHref, classes }: ReportClassSelectProps) {
  const router = useRouter();

  return (
    <div className="mb-4 max-w-md space-y-2">
      <Label htmlFor="report-class">Chọn lớp để xem báo cáo</Label>
      <select
        className="h-11 w-full rounded-xl border border-input bg-card px-3 text-base font-semibold text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 md:text-sm"
        defaultValue=""
        id="report-class"
        onChange={(event) => {
          const classId = event.target.value;
          if (classId === "all") {
            router.push(allReportsHref);
            return;
          }

          if (classId) {
            router.push(`/classes/${classId}/reports`);
          }
        }}
      >
        <option disabled value="">
          Chọn lớp trong năm học này
        </option>
        <option value="all">Tất cả các lớp trong năm học này</option>
        {classes.map((classItem) => (
          <option key={classItem.id} value={classItem.id}>
            {classItem.name} · {classItem.school_year} · Khối {classItem.grade}
          </option>
        ))}
      </select>
    </div>
  );
}
