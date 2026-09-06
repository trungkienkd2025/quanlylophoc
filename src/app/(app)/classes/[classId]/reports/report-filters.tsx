"use client";

import { useRouter } from "next/navigation";
import { weekNumbers } from "@/lib/weeks";
import type { WeekRange } from "@/types/reports";

type ReportFiltersProps = {
  basePath?: string;
  classId?: string;
  range: WeekRange;
};

const weeks = weekNumbers();

export function ReportFilters({
  basePath,
  classId,
  range,
}: ReportFiltersProps) {
  const router = useRouter();
  const reportPath =
    basePath ?? (classId ? `/classes/${classId}/reports` : "/reports");

  function navigate(fromWeek: number, toWeek: number) {
    const [pathname, query = ""] = reportPath.split("?");
    const params = new URLSearchParams(query);
    params.set("fromWeek", String(fromWeek));
    params.set("toWeek", String(toWeek));

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <WeekSelect
        id="report-from-week"
        label="Từ tuần"
        value={range.fromWeek}
        onChange={(week) => navigate(week, Math.max(week, range.toWeek))}
      />
      <WeekSelect
        id="report-to-week"
        label="Đến tuần"
        value={range.toWeek}
        onChange={(week) => navigate(Math.min(range.fromWeek, week), week)}
      />
    </div>
  );
}

function WeekSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (week: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      <select
        className="flex h-11 min-w-28 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        id={id}
        onChange={(event) => onChange(Number(event.target.value))}
        value={value}
      >
        {weeks.map((week) => (
          <option key={week} value={week}>
            {week}
          </option>
        ))}
      </select>
    </div>
  );
}
