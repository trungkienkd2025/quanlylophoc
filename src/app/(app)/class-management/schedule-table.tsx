const SCHEDULE_ROWS = [
  ["", "5/1", "1/4", "2/1", "4/3"],
  ["5/4 - LVT", "5/2", "", "2/4", "3/4"],
  ["5/3 - LVT", "1/2", "5/5", "2/5", "4/4"],
  ["5/2 - LVT", "1/1", "5/4", "4/5", ""],
  ["5/3", "3/2", "3/5", "4/1", ""],
  ["5/1", "3/3", "2/2", "4/2", ""],
  ["", "3/1", "2/3", "5/6", ""],
] as const;

export function ScheduleTable() {
  return (
    <section
      aria-label="Bảng phân công theo thứ và buổi"
      className="mb-5 flex justify-center"
    >
      <div className="max-w-full overflow-x-auto">
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
            {SCHEDULE_ROWS.map((periods, rowIndex) => (
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
                    className="border border-black px-2 py-1 font-normal"
                    key={`${rowIndex}-${columnIndex}`}
                  >
                    {period || "\u00a0"}
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
