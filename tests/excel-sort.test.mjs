import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findExcelNameColumn,
  sortExcelRowsByColumnC,
  sortExcelRowsByNameColumn,
} from "../src/lib/excel/sort.ts";

describe("Excel name-column sorting", () => {
  it("keeps title and header rows in place and sorts data by Họ và tên", () => {
    const rows = [
      ["BÁO CÁO TUẦN 1"],
      ["STT", "Mã số", "Họ và tên"],
      [1, "HS03", "Trần Ngọc Ý"],
      [2, "HS01", "Thạch Thị Anh Thư"],
      [3, "HS02", "Nguyễn Cát Tường"],
    ];

    assert.deepEqual(sortExcelRowsByNameColumn(rows), [
      ["BÁO CÁO TUẦN 1"],
      ["STT", "Mã số", "Họ và tên"],
      [3, "HS02", "Nguyễn Cát Tường"],
      [2, "HS01", "Thạch Thị Anh Thư"],
      [1, "HS03", "Trần Ngọc Ý"],
    ]);
  });

  it("finds the Họ tên header regardless of accents, case, and column position", () => {
    const rows = [["STT", "HO TEN", "Lớp"], [1, "An", "4A"]];

    assert.deepEqual(findExcelNameColumn(rows), { headerRowIndex: 0, columnIndex: 1 });
  });

  it("does not mutate the imported rows", () => {
    const rows = [["Cột A", "Họ tên"], [1, "B"], [2, "A"]];
    sortExcelRowsByNameColumn(rows);

    assert.deepEqual(rows, [["Cột A", "Họ tên"], [1, "B"], [2, "A"]]);
  });

  it("returns null rather than sorting the wrong column when no name header exists", () => {
    assert.equal(sortExcelRowsByNameColumn([["Mã số", "Lớp"], ["HS01", "4A"]]), null);
  });

  it("retains the legacy column C helper", () => {
    const rows = [["STT", "Mã số", "Họ và tên"], [1, "HS02", "B"], [2, "HS01", "A"]];
    assert.deepEqual(sortExcelRowsByColumnC(rows), [
      ["STT", "Mã số", "Họ và tên"],
      [2, "HS01", "A"],
      [1, "HS02", "B"],
    ]);
  });
});
