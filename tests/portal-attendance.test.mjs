import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePortalAttendanceGrade } from "../src/lib/student-quiz/attendance.ts";

describe("portal attendance grade", () => {
  it("uses the grade in the entered class instead of the learning-content picker", () => {
    assert.equal(resolvePortalAttendanceGrade("5/6", 4), 5);
    assert.equal(resolvePortalAttendanceGrade("Lớp 4A", 5), 4);
  });

  it("keeps the selected grade when the class name does not state a grade", () => {
    assert.equal(resolvePortalAttendanceGrade("Hoa Phượng", 5), 5);
  });
});
