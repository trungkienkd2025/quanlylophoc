"use client";

import { useEffect, useState } from "react";

const SCHEDULE_ROW_COUNT = 7;
const SCHEDULE_COLUMN_COUNT = 5;

type ScheduleRows = string[][];

const SCHEDULE_STORAGE_KEY_PREFIX = "qllh-class-management-schedule-v2";

function createEmptySchedule(): ScheduleRows {
  return Array.from({ length: SCHEDULE_ROW_COUNT }, () =>
    Array.from({ length: SCHEDULE_COLUMN_COUNT }, () => ""),
  );
}

function isSavedSchedule(value: unknown): value is ScheduleRows {
  return (
    Array.isArray(value) &&
    value.length === SCHEDULE_ROW_COUNT &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === SCHEDULE_COLUMN_COUNT &&
        row.every((cell) => typeof cell === "string"),
    )
  );
}

export function ScheduleTable({ teacherId }: { teacherId: string }) {
  const storageKey = `${SCHEDULE_STORAGE_KEY_PREFIX}:${teacherId}`;
  const [scheduleRows, setScheduleRows] =
    useState<ScheduleRows>(createEmptySchedule);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedSchedule = window.localStorage.getItem(storageKey);

    if (savedSchedule) {
      try {
        const parsedSchedule: unknown = JSON.parse(savedSchedule);
        if (isSavedSchedule(parsedSchedule)) {
          setScheduleRows(parsedSchedule);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setIsLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (isLoaded) {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(scheduleRows),
      );
    }
  }, [isLoaded, scheduleRows, storageKey]);

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
          Chạm vào từng ô để sửa. Nội dung được tự động lưu riêng cho tài
          khoản này trên thiết bị.
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
