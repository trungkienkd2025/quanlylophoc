"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { saveScores } from "@/app/actions/scores";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Student = { id: string; full_name: string; student_code: string };
type Score = {
  student_id: string;
  theory_score: number | null;
  practice_score: number | null;
  total_score: number | null;
};
type SortMode = "name" | "code";
type ScoreType = "semester" | "annual";
const SELECTED_SCORE_TYPE_STORAGE_KEY = "qllh:selected-score-type";

type ScoreEntry = {
  student_id: string;
  full_name: string;
  student_code: string;
  semesterTheory: string;
  semesterPractice: string;
  annualTheory: string;
  annualPractice: string;
};

function fmt(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function clampScore(value: string | number) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.min(10, Math.max(0, score));
}

export function calculateTotal(
  theory: string | number,
  practice: string | number,
) {
  const theoryScore = clampScore(theory);
  const practiceScore = clampScore(practice);
  if (theoryScore == null || practiceScore == null) return 0;
  const sum = theoryScore + practiceScore;
  const rounded = Math.ceil(sum);
  return rounded;
}

function normalizeScoreInput(value: string) {
  if (value === "") return value;
  const score = clampScore(value);
  return score == null ? value : String(score);
}

function getVietnameseNameParts(fullName: string) {
  return fullName.trim().split(/\s+/).filter(Boolean).reverse();
}

function compareStudentsByVietnameseName(
  a: { full_name: string },
  b: { full_name: string },
) {
  const aParts = getVietnameseNameParts(a.full_name);
  const bParts = getVietnameseNameParts(b.full_name);
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const result = (aParts[index] ?? "").localeCompare(
      bParts[index] ?? "",
      "vi",
      {
        sensitivity: "base",
      },
    );
    if (result !== 0) return result;
  }

  return a.full_name.localeCompare(b.full_name, "vi", {
    sensitivity: "base",
  });
}

export function sortStudentsByAlphabet<T extends { full_name: string }>(
  students: T[],
) {
  return [...students].sort(compareStudentsByVietnameseName);
}

function compareStudents(a: Student, b: Student, mode: SortMode) {
  if (mode === "code") {
    return a.student_code.localeCompare(b.student_code, "vi", {
      numeric: true,
      sensitivity: "base",
    });
  }
  return compareStudentsByVietnameseName(a, b);
}

function sanitizeFilenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function scoreTypeLabel(type: ScoreType) {
  return type === "semester" ? "HocKy1" : "CuoiNam";
}

function getScoreFields(type: ScoreType) {
  return type === "semester"
    ? {
        theoryField: "semesterTheory" as const,
        practiceField: "semesterPractice" as const,
      }
    : {
        theoryField: "annualTheory" as const,
        practiceField: "annualPractice" as const,
      };
}

export function exportScoreToExcel(input: {
  className: string;
  schoolYear: string;
  type: ScoreType;
  entries: ScoreEntry[];
}) {
  const { theoryField, practiceField } = getScoreFields(input.type);
  const rows = input.entries.map((entry, index) => [
    index + 1,
    entry.full_name,
    entry[theoryField] === "" ? null : Number(entry[theoryField]),
    entry[practiceField] === "" ? null : Number(entry[practiceField]),
    calculateTotal(entry[theoryField], entry[practiceField]),
  ]);
  const data = [
    ["STT", "Họ và tên", "Lý thuyết", "Thực hành", "Tổng"],
    ...rows,
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:E1");

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      if (!cell) continue;
      cell.s = {
        font: row === 0 ? { bold: true } : undefined,
        alignment: {
          horizontal: col === 1 ? "left" : "center",
          vertical: "center",
        },
        border: {
          top: { style: "thin", color: { rgb: "D9D9D9" } },
          bottom: { style: "thin", color: { rgb: "D9D9D9" } },
          left: { style: "thin", color: { rgb: "D9D9D9" } },
          right: { style: "thin", color: { rgb: "D9D9D9" } },
        },
      };
    }
  }

  sheet["!cols"] = data[0].map((_, columnIndex) => ({
    wch:
      Math.max(...data.map((row) => String(row[columnIndex] ?? "").length), 8) +
      2,
  }));

  XLSX.utils.book_append_sheet(workbook, sheet, "Điểm học tập");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Bang_diem_Lop_${sanitizeFilenamePart(input.className)}_${scoreTypeLabel(input.type)}_${sanitizeFilenamePart(input.schoolYear)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ScoreBoard({
  classId,
  className,
  schoolYear,
  students,
  semesterScores,
  annualScores,
}: {
  classId: string;
  className: string;
  schoolYear: string;
  students: Student[];
  semesterScores: Score[];
  annualScores: Score[];
}) {
  const router = useRouter();
  const [type, setType] = useState<ScoreType>(() => {
    if (typeof window === "undefined") return "semester";
    return window.localStorage.getItem(SELECTED_SCORE_TYPE_STORAGE_KEY) ===
      "annual"
      ? "annual"
      : "semester";
  });
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [entries, setEntries] = useState(() => {
    const semesterMap = new Map(semesterScores.map((s) => [s.student_id, s]));
    const annualMap = new Map(annualScores.map((s) => [s.student_id, s]));
    return students.map((student) => ({
      student_id: student.id,
      full_name: student.full_name,
      student_code: student.student_code,
      semesterTheory: fmt(semesterMap.get(student.id)?.theory_score),
      semesterPractice: fmt(semesterMap.get(student.id)?.practice_score),
      annualTheory: fmt(annualMap.get(student.id)?.theory_score),
      annualPractice: fmt(annualMap.get(student.id)?.practice_score),
    }));
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  useEffect(() => {
    window.localStorage.setItem(SELECTED_SCORE_TYPE_STORAGE_KEY, type);
  }, [type]);

  const ordered = useMemo(
    () =>
      [...entries].sort((a, b) =>
        compareStudents(
          {
            id: a.student_id,
            full_name: a.full_name,
            student_code: a.student_code,
          },
          {
            id: b.student_id,
            full_name: b.full_name,
            student_code: b.student_code,
          },
          sortMode,
        ),
      ),
    [entries, sortMode],
  );

  function patch(
    id: string,
    field:
      | "semesterTheory"
      | "semesterPractice"
      | "annualTheory"
      | "annualPractice",
    value: string,
  ) {
    const normalizedValue = normalizeScoreInput(value);
    setEntries((current) =>
      current.map((entry) =>
        entry.student_id === id
          ? { ...entry, [field]: normalizedValue }
          : entry,
      ),
    );
  }

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      const result = await saveScores(
        classId,
        type,
        entries.map((entry) => ({
          student_id: entry.student_id,
          theory_score:
            type === "semester" ? entry.semesterTheory : entry.annualTheory,
          practice_score:
            type === "semester" ? entry.semesterPractice : entry.annualPractice,
          total_score: calculateTotal(
            type === "semester" ? entry.semesterTheory : entry.annualTheory,
            type === "semester" ? entry.semesterPractice : entry.annualPractice,
          ),
        })),
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.success ?? "Đã lưu điểm.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setType("semester")}
            variant={type === "semester" ? "default" : "outline"}
          >
            Học kỳ 1
          </Button>
          <Button
            onClick={() => setType("annual")}
            variant={type === "annual" ? "default" : "outline"}
          >
            Cuối năm
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="score-sort">Sắp xếp theo</Label>
            <select
              className="flex h-9 rounded-lg border bg-background px-2 text-sm"
              id="score-sort"
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              value={sortMode}
            >
              <option value="name">Alphabet</option>
              <option value="code">Mã số học sinh</option>
            </select>
          </div>
          <Button
            onClick={() =>
              exportScoreToExcel({
                className,
                schoolYear,
                type,
                entries: ordered,
              })
            }
          >
            Xuất Excel
          </Button>
          <Button disabled={isSaving} onClick={handleSave}>
            {isSaving ? "Đang lưu…" : "Lưu điểm"}
          </Button>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Tổng tự tính: Lý thuyết + Thực hành. Sắp xếp chỉ đổi thứ tự
        hiển thị.
      </p>
      {message ? (
        <p className="mb-2 text-sm text-emerald-600">{message}</p>
      ) : null}
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-4 text-center text-muted-foreground">
            Lớp chưa có học sinh để nhập điểm.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden gap-2 border-b bg-muted/50 p-3 text-sm font-bold text-black lg:grid lg:grid-cols-[1fr_140px_140px_100px] lg:items-center">
            <span>Học sinh</span>
            <span>Lý thuyết</span>
            <span>Thực hành</span>
            <span>Tổng</span>
          </div>
          <div className="divide-y">
            {ordered.map((entry, index) => {
              const { theoryField, practiceField } = getScoreFields(type);
              return (
                <div
                  className="grid gap-2 p-3 lg:grid-cols-[1fr_140px_140px_100px] lg:items-center"
                  key={entry.student_id}
                >
                  <div>
                    <p className="font-semibold">
                      {index + 1}. {entry.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.student_code}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label
                      className="text-sm font-bold text-black lg:sr-only"
                      htmlFor={`${entry.student_id}-theory`}
                    >
                      Lý thuyết
                    </Label>
                    <Input
                      id={`${entry.student_id}-theory`}
                      inputMode="decimal"
                      max="10"
                      min="0"
                      onChange={(event) =>
                        patch(entry.student_id, theoryField, event.target.value)
                      }
                      placeholder="0–10"
                      type="number"
                      value={entry[theoryField]}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      className="text-sm font-bold text-black lg:sr-only"
                      htmlFor={`${entry.student_id}-practice`}
                    >
                      Thực hành
                    </Label>
                    <Input
                      id={`${entry.student_id}-practice`}
                      inputMode="decimal"
                      max="10"
                      min="0"
                      onChange={(event) =>
                        patch(
                          entry.student_id,
                          practiceField,
                          event.target.value,
                        )
                      }
                      placeholder="0–10"
                      type="number"
                      value={entry[practiceField]}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-black lg:sr-only">
                      Tổng
                    </p>
                    <div className="rounded-lg bg-muted px-3 py-2 text-sm font-bold">
                      {calculateTotal(entry[theoryField], entry[practiceField])}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
