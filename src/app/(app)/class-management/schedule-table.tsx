"use client";

import { useEffect, useState } from "react";

const DEFAULT_SCHEDULE_ROWS = [
  ["", "5/1", "1/4", "2/1", "4/3"],
  ["5/4 - LVT", "5/2", "", "2/4", "3/4"],
  ["5/3 - LVT", "1/2", "5/5", "2/5", "4/4"],
  ["5/2 - LVT", "1/1", "5/4", "4/5", ""],
  ["5/3", "3/2", "3/5", "4/1", ""],
  ["5/1", "3/3", "2/2", "4/2", ""],
  ["", "3/1", "2/3", "5/6", ""],
] as const;

type ScheduleRows = string[][];

const SCHEDULE_STORAGE_KEY = "qllh-class-management-schedule-v1";

function isSavedSchedule(value: unknown): value is ScheduleRows {
  return (
    Array.isArray(value) &&
    value.length === DEFAULT_SCHEDULE_ROWS.length &&
    value.every(
      (row, rowIndex) =>
        Array.isArray(row) &&
        row.length === DEFAULT_SCHEDULE_ROWS[rowIndex].length &&
        row.every((cell) => typeof cell === "string"),
    )
  );
}

export function ScheduleTable() {
  const [scheduleRows, setScheduleRows] = useState<ScheduleRows>(() =>
    DEFAULT_SCHEDULE_ROWS.map((row) => [...row]),
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedSchedule = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);

    if (savedSchedule) {
      try {
        const parsedSchedule: unknown = JSON.parse(savedSchedule);
        if (isSavedSchedule(parsedSchedule)) {
          setScheduleRows(parsedSchedule);
        }
      } catch {
        window.localStorage.removeItem(SCHEDULE_STORAGE_KEY);
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      window.localStorage.setItem(
        SCHEDULE_STORAGE_KEY,
        JSON.stringify(scheduleRows),
      );
    }
  }, [isLoaded, scheduleRows]);

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    setScheduleRows((currentRows) =>
      currentRows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) =>
              currentColumnIndex === columnIndex ? value : cell,
            )
          : row,
      ),
    );
  }

  return (
    <section
      aria-label="Bảng phân công theo thứ và buổi"
      className="mb-5 flex justify-center"
    >
      <div className="max-w-full overflow-x-auto pb-1">
        <p className="mb-2 text-center text-sm text-muted-foreground">
          Chạm vào từng ô để sửa. Nội dung được tự động lưu trên thiết bị này.
        </p>
        <table className="w-[652px] table-fixed border-collapse bg-white text-center text-base font-normal">
          <thead>
            <tr>
              <th className="w-[66px] border border-black px-2 py-1 font-normal">
                STT
              </th>
              <th className="w-[112px] border border-black px-2 py-1 font-normal">
                Thứ/Buổi
              </th>
              {[2, 3, 4, 5, 6].map((day) => (
                <th
                  className="border border-black px-2 py-1 font-normal"
                  key={day}
                  scope="col"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scheduleRows.map((periods, rowIndex) => (
              <tr key={rowIndex + 1}>
                <th
                  className="border border-black px-2 py-1 font-normal"
                  scope="row"
                >
                  {rowIndex + 1}
                </th>
                {rowIndex === 0 ? (
                  <th
                    className="border border-black px-2 py-1 text-lg font-normal"
                    rowSpan={4}
                    scope="rowgroup"
                  >
                    Sáng
                  </th>
                ) : null}
                {rowIndex === 4 ? (
                  <th
                    className="border border-black px-2 py-1 text-lg font-normal"
                    rowSpan={3}
                    scope="rowgroup"
                  >
                    Chiều
                  </th>
                ) : null}
                {periods.map((period, columnIndex) => (
                  <td
                    className="border border-black p-0 font-normal"
                    key={`${rowIndex}-${columnIndex}`}
                  >
                    <textarea
                      aria-label={`Tiết ${rowIndex + 1}, thứ ${columnIndex + 2}`}
                      className="block min-h-12 w-full resize-none overflow-hidden bg-transparent px-2 py-2 text-center font-normal outline-none transition-colors hover:bg-sky-50 focus:bg-sky-50 focus:ring-2 focus:ring-inset focus:ring-primary"
                      onChange={(event) =>
                        updateCell(rowIndex, columnIndex, event.target.value)
                      }
                      rows={1}
                      spellCheck={false}
                      value={period}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
