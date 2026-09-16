/** School-year calendar helpers. Weeks are 1–35 (not hard-coded in UI components). */

export const TOTAL_WEEKS = 35 as const;

export type WeekNumber = number;

export type WeekDateRange = {
  week_number: number;
  start_date: string | null;
  end_date: string | null;
};

export function weekNumbers(): number[] {
  return Array.from({ length: TOTAL_WEEKS }, (_, index) => index + 1);
}

export function isValidWeekNumber(week: number): boolean {
  return Number.isInteger(week) && week >= 1 && week <= TOTAL_WEEKS;
}

export function clampWeekNumber(week: number): number {
  if (!Number.isFinite(week)) return 1;
  return Math.min(TOTAL_WEEKS, Math.max(1, Math.trunc(week)));
}

/**
 * Estimate current teaching week from school-year label `YYYY-YYYY`.
 * Vietnam elementary years typically start around 1 September.
 */
export function estimateCurrentWeek(schoolYearName: string, now = new Date()): number {
  const startYear = Number.parseInt(schoolYearName.slice(0, 4), 10);
  if (!Number.isFinite(startYear)) return 1;

  const start = new Date(startYear, 8, 1); // 1 Sep local
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return 1;

  const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return clampWeekNumber(week);
}

function dateFromIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
    ? null
    : date;
}

/**
 * Chooses the teaching week for a local calendar date.
 *
 * A week must have both dates before it can represent a date range. If today is
 * outside every completed range, choose the range whose nearest boundary is
 * closest to today. This keeps a newly opened class on the most relevant
 * configured week instead of estimating it only from the school-year label.
 */
export function selectWeekForDate(
  schoolYearName: string,
  weekMetas: WeekDateRange[],
  now = new Date(),
): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ranges = weekMetas.flatMap((meta) => {
    if (!isValidWeekNumber(meta.week_number) || !meta.start_date || !meta.end_date) {
      return [];
    }

    const start = dateFromIsoDate(meta.start_date);
    const end = dateFromIsoDate(meta.end_date);
    if (!start || !end || start > end) return [];

    return [{ week: meta.week_number, start, end }];
  });

  const currentRange = ranges.find(({ start, end }) => start <= today && today <= end);
  if (currentRange) return currentRange.week;

  const nearestRange = ranges.reduce<(typeof ranges)[number] | undefined>(
    (nearest, range) => {
      if (!nearest) return range;

      const distance = Math.min(
        Math.abs(today.getTime() - range.start.getTime()),
        Math.abs(today.getTime() - range.end.getTime()),
      );
      const nearestDistance = Math.min(
        Math.abs(today.getTime() - nearest.start.getTime()),
        Math.abs(today.getTime() - nearest.end.getTime()),
      );

      return distance < nearestDistance ||
        (distance === nearestDistance && range.week < nearest.week)
        ? range
        : nearest;
    },
    undefined,
  );

  return nearestRange?.week ?? estimateCurrentWeek(schoolYearName, now);
}

export function weekLabel(week: number): string {
  return `Tuần ${week}`;
}
