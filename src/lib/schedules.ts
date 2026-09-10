import { z } from "zod";

export const SCHEDULE_ROW_COUNT = 7;
export const SCHEDULE_COLUMN_COUNT = 5;

export const scheduleSchema = z
  .array(z.array(z.string().max(200)).length(SCHEDULE_COLUMN_COUNT))
  .length(SCHEDULE_ROW_COUNT);

export type ScheduleRows = z.infer<typeof scheduleSchema>;

export function createEmptySchedule(): ScheduleRows {
  return Array.from({ length: SCHEDULE_ROW_COUNT }, () =>
    Array.from({ length: SCHEDULE_COLUMN_COUNT }, () => ""),
  );
}
