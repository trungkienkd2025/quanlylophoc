import { getLocalDayBoundsIso } from "@/lib/dates";
import type { WeekRange } from "@/types/reports";
import { isValidWeekNumber, TOTAL_WEEKS } from "@/lib/weeks";

export function getLocalRangeBoundsIso(
  startDate: string,
  endDate: string,
): {
  start: string;
  end: string;
} {
  const start = getLocalDayBoundsIso(startDate).start;
  const end = getLocalDayBoundsIso(endDate).end;
  return { start, end };
}

export function resolveReportWeekRange(
  fromWeek?: string,
  toWeek?: string,
): WeekRange | null {
  const start = fromWeek === undefined ? 1 : Number(fromWeek);
  const end = toWeek === undefined ? TOTAL_WEEKS : Number(toWeek);

  if (!isValidWeekNumber(start) || !isValidWeekNumber(end) || start > end)
    return null;
  return { fromWeek: start, toWeek: end };
}

export function formatReportRangeLabel(range: WeekRange): string {
  return range.fromWeek === range.toWeek
    ? `Tuần ${range.fromWeek}`
    : `Từ tuần ${range.fromWeek} đến tuần ${range.toWeek}`;
}
