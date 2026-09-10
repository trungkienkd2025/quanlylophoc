"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveSchedule } from "@/app/actions/schedule";
import {
  createEmptySchedule,
  scheduleSchema,
  type ScheduleRows,
} from "@/lib/schedules";

const SCHEDULE_STORAGE_KEY_PREFIX = "qllh-class-management-schedule-v2";

function isSavedSchedule(value: unknown): value is ScheduleRows {
  return scheduleSchema.safeParse(value).success;
}

export function ScheduleTable({
  initialSchedule,
  teacherId,
}: {
  initialSchedule: ScheduleRows | null;
  teacherId: string;
}) {
  const storageKey = `${SCHEDULE_STORAGE_KEY_PREFIX}:${teacherId}`;
  const [scheduleRows, setScheduleRows] =
    useState<ScheduleRows>(initialSchedule ?? createEmptySchedule);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >(initialSchedule ? "saved" : "idle");
  const [saveError, setSaveError] = useState("");
  const skipFirstSave = useRef(true);
  const saveTimer = useRef<number | null>(null);
  const saveRequest = useRef(0);

  const persistSchedule = useCallback(async (rows: ScheduleRows) => {
    const request = ++saveRequest.current;
    setSaveState("saving");
    setSaveError("");
    const result = await saveSchedule(rows);

    if (request !== saveRequest.current) return;
    if (result.success) {
      setSaveState("saved");
    } else {
      setSaveState("error");
      setSaveError(result.error);
    }
  }, []);

  useEffect(() => {
    const savedSchedule = window.localStorage.getItem(storageKey);

    if (!initialSchedule && savedSchedule) {
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
  }, [initialSchedule, storageKey]);

  useEffect(() => {
    if (!isLoaded) return;

    window.localStorage.setItem(storageKey, JSON.stringify(scheduleRows));
    if (skipFirstSave.current && initialSchedule) {
      skipFirstSave.current = false;
      return;
    }

    skipFirstSave.current = false;
    saveTimer.current = window.setTimeout(() => {
      void persistSchedule(scheduleRows);
    }, 700);

    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [initialSchedule, isLoaded, persistSchedule, scheduleRows, storageKey]);

  function saveNow() {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    void persistSchedule(scheduleRows);
  }

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
        <div
          aria-live="polite"
          className="mb-2 text-center text-sm text-muted-foreground"
        >
          <p>
            Chạm vào từng ô để sửa. Nội dung được tự động lưu vào tài khoản
            này.
          </p>
          <p
            className={saveState === "error" ? "mt-1 text-destructive" : "mt-1"}
          >
            {saveState === "saving"
              ? "Đang lưu…"
              : saveState === "saved"
                ? "Đã lưu — bạn có thể xem trên thiết bị khác."
                : saveState === "error"
                  ? saveError
                  : "Nội dung sẽ được lưu sau khi bạn nhập."}
          </p>
        </div>
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
                      maxLength={200}
                      onBlur={saveNow}
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
