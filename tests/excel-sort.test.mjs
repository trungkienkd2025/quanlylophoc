import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sortExcelRowsByColumnC } from "../src/lib/excel/sort.ts";

describe("Excel column C sorting", () => {
  it("keeps the header and sorts data rows by Vietnamese ABC order in column C", () => {
    const rows = [
      ["STT", "Mã số", "Họ và tên"],
      [1, "HS03", "Trần Ngọc Ý"],
      [2, "HS01", "Thạch Thị Anh Thư"],
      [3, "HS02", "Nguyễn Cát Tường"],
    ];

    assert.deepEqual(sortExcelRowsByColumnC(rows), [
      ["STT", "Mã số", "Họ và tên"],
      [3, "HS02", "Nguyễn Cát Tường"],
      [2, "HS01", "Thạch Thị Anh Thư"],
      [1, "HS03", "Trần Ngọc Ý"],
    ]);
  });

  it("does not mutate the imported rows", () => {
    const rows = [["Cột A", "Cột B", "Cột C"], [1, 1, "B"], [2, 2, "A"]];
    sortExcelRowsByColumnC(rows);

    assert.deepEqual(rows, [["Cột A", "Cột B", "Cột C"], [1, 1, "B"], [2, 2, "A"]]);
  });
});
