import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sortStudents } from "../src/lib/students/sort.ts";

const students = [
  { full_name: "Trần Ngọc Ý", student_code: "HS44" },
  { full_name: "Đoàn Khánh Tường", student_code: "HS41" },
  { full_name: "Thạch Thị Anh Thư", student_code: "HS34" },
  { full_name: "Nguyễn Cát Tường", student_code: "HS40" },
];

describe("student list sorting", () => {
  it("sorts A-Z by the Vietnamese given name", () => {
    assert.deepEqual(
      sortStudents(students, "name").map((student) => student.full_name),
      [
        "Thạch Thị Anh Thư",
        "Nguyễn Cát Tường",
        "Đoàn Khánh Tường",
        "Trần Ngọc Ý",
      ],
    );
  });

  it("sorts student codes from low to high using their numeric portions", () => {
    const unorderedCodes = [
      { full_name: "Học sinh C", student_code: "HS10" },
      { full_name: "Học sinh A", student_code: "HS2" },
      { full_name: "Học sinh B", student_code: "HS9" },
    ];

    assert.deepEqual(
      sortStudents(unorderedCodes, "code").map(
        (student) => student.student_code,
      ),
      ["HS2", "HS9", "HS10"],
    );
  });

  it("does not mutate the original student list", () => {
    const originalOrder = students.map((student) => student.student_code);
    sortStudents(students, "code");
    assert.deepEqual(
      students.map((student) => student.student_code),
      originalOrder,
    );
  });
});
