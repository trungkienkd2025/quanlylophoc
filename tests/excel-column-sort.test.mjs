import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as XLSX from "xlsx";
import { sortExcelFileByThirdColumn } from "../src/lib/excel-column-sort.ts";

describe("Excel column C sorting", () => {
  it("keeps the header and moves each complete row with Vietnamese column C order", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["STT", "Mã HS", "Họ và tên", "Lớp", "Ghi chú"],
      [1, "HS01", "Trần Văn Bình", "4A", "Tốt"],
      [2, "HS02", "Nguyễn Văn An", "4B", "Khá"],
      [3, "HS03", "Lê Văn Cường", "4A", "Tốt"],
      [4, "HS04", "Đỗ Văn Minh", "4C", "Khá"],
      [5, "HS05", "", "4D", "Chờ bổ sung"],
      [6, "HS06", "Nguyễn Văn An", "4E", "Trùng tên"],
      ["", "", "", "", ""],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ liệu");

    const result = sortExcelFileByThirdColumn(
      XLSX.write(workbook, { bookType: "xlsx", type: "array" }),
    );
    const parsed = XLSX.read(result, { type: "array" });
    const rows = XLSX.utils.sheet_to_json(parsed.Sheets["Dữ liệu"], { header: 1, defval: "" });

    assert.deepEqual(rows, [
      ["STT", "Mã HS", "Họ và tên", "Lớp", "Ghi chú"],
      [4, "HS04", "Đỗ Văn Minh", "4C", "Khá"],
      [3, "HS03", "Lê Văn Cường", "4A", "Tốt"],
      [2, "HS02", "Nguyễn Văn An", "4B", "Khá"],
      [6, "HS06", "Nguyễn Văn An", "4E", "Trùng tên"],
      [1, "HS01", "Trần Văn Bình", "4A", "Tốt"],
      [5, "HS05", "", "4D", "Chờ bổ sung"],
    ]);
  });
});
