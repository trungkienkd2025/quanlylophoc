"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DateRange, ReportFilter } from "@/types/reports";

type ReportFiltersProps = {
  basePath?: string;
  classId?: string;
  filter: ReportFilter;
  range: DateRange;
};

export function ReportFilters({ basePath, classId, filter, range }: ReportFiltersProps) {
  const router = useRouter();
  const [from, setFrom] = useState(range.start);
  const [to, setTo] = useState(range.end);
  const reportPath = basePath ?? (classId ? `/classes/${classId}/reports` : "/reports");

  function navigate(nextFilter: ReportFilter, customRange?: DateRange) {
    const [pathname, query = ""] = reportPath.split("?");
    const params = new URLSearchParams(query);
    params.set("filter", nextFilter);

    if (nextFilter === "custom" && customRange) {
      params.set("from", customRange.start);
      params.set("to", customRange.end);
    } else {
      params.delete("from");
      params.delete("to");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["today", "Hôm nay"],
            ["week", "Tuần này"],
            ["month", "Tháng này"],
            ["custom", "Tuỳ chọn"],
          ] as const
        ).map(([value, label]) => (
          <Button
            className="h-10"
            key={value}
            onClick={() => {
              if (value === "custom") return;
              navigate(value);
            }}
            type="button"
            variant={filter === value ? "default" : "outline"}
          >
            {label}
          </Button>
        ))}
      </div>

      {filter === "custom" ? (
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            navigate("custom", { start: from, end: to });
          }}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="report-from">
              Từ ngày
            </label>
            <Input
              className="h-11"
              id="report-from"
              name="from"
              onChange={(event) => setFrom(event.target.value)}
              type="date"
              value={from}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="report-to">
              Đến ngày
            </label>
            <Input
              className="h-11"
              id="report-to"
              name="to"
              onChange={(event) => setTo(event.target.value)}
              type="date"
              value={to}
            />
          </div>
          <Button className="h-11" type="submit">
            Áp dụng
          </Button>
        </form>
      ) : null}
    </div>
  );
}
