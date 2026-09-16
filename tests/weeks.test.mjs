import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectWeekForDate } from "../src/lib/weeks.ts";

describe("week selection by configured dates", () => {
  const schoolYear = "2026-2027";

  it("selects the week whose inclusive date range contains today", () => {
    assert.equal(
      selectWeekForDate(
        schoolYear,
        [
          { week_number: 1, start_date: "2026-09-07", end_date: "2026-09-11" },
          { week_number: 2, start_date: "2026-09-14", end_date: "2026-09-18" },
        ],
        new Date(2026, 8, 18, 16),
      ),
      2,
    );
  });

  it("selects the closest configured week when today is between ranges", () => {
    assert.equal(
      selectWeekForDate(
        schoolYear,
        [
          { week_number: 1, start_date: "2026-09-07", end_date: "2026-09-11" },
          { week_number: 2, start_date: "2026-09-21", end_date: "2026-09-25" },
        ],
        new Date(2026, 8, 16),
      ),
      1,
    );
  });

  it("falls back to the school-year estimate when no complete date range exists", () => {
    assert.equal(
      selectWeekForDate(
        schoolYear,
        [{ week_number: 2, start_date: "2026-09-14", end_date: null }],
        new Date(2026, 8, 16),
      ),
      3,
    );
  });
});
