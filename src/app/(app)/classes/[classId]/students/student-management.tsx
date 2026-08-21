"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveAs } from "file-saver";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownAZ,
  Eye,
  Download,
  FileSpreadsheet,
  Hash,
  Pencil,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { softDeleteStudent } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateVi, genderLabel } from "@/lib/students/format";
import { formatPointsTotal } from "@/lib/points/format";
import type { StudentListItem } from "@/types/student";
import type { StudentPointTotals } from "@/types/points";
import { StudentFormPanel } from "./student-form-panel";
import { StudentImportPanel } from "./student-import-panel";
import { StudentPointsControls } from "./student-points-controls";
import * as XLSX from "xlsx";

type StudentManagementProps = {
  classId: string;
  className: string;
  initialEditId?: string;
  pointTotals: StudentPointTotals;
  schoolYear: string;
  semesterScoreTotals: StudentScoreTotals;
  annualScoreTotals: StudentScoreTotals;
  students: StudentListItem[];
};

type PanelMode = "none" | "create" | "edit" | "import";
type SortMode = "name" | "code";
type ScoreType = "semester" | "annual";
type StudentScoreTotals = Record<string, number | null | undefined>;

const SELECTED_SCORE_TYPE_STORAGE_KEY = "qllh:selected-score-type";

function getVietnameseNameParts(fullName: string) {
  return fullName.trim().split(/\s+/).filter(Boolean).reverse();
}

function compareStudentsByName(a: StudentListItem, b: StudentListItem) {
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

  return a.full_name.localeCompare(b.full_name, "vi", { sensitivity: "base" });
}

export function sortStudentsByNameAZ(students: StudentListItem[]) {
  return [...students].sort(compareStudentsByName);
}

function compareStudents(
  a: StudentListItem,
  b: StudentListItem,
  sortMode: SortMode,
) {
  if (sortMode === "name") return compareStudentsByName(a, b);

  return (
    a.student_code.localeCompare(b.student_code, "vi", {
      numeric: true,
      sensitivity: "base",
    }) || compareStudentsByName(a, b)
  );
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

function getSelectedScoreType(): ScoreType {
  if (typeof window === "undefined") return "semester";
  return window.localStorage.getItem(SELECTED_SCORE_TYPE_STORAGE_KEY) ===
    "annual"
    ? "annual"
    : "semester";
}

function getScoreTotal(
  studentId: string,
  scoreType: ScoreType,
  semesterScoreTotals: StudentScoreTotals,
  annualScoreTotals: StudentScoreTotals,
) {
  return scoreType === "annual"
    ? annualScoreTotals[studentId]
    : semesterScoreTotals[studentId];
}

function saveExcelFile(workbook: XLSX.WorkBook, fileName: string) {
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, fileName);
}

export function exportStudentsToExcel(input: {
  annualScoreTotals: StudentScoreTotals;
  className: string;
  schoolYear: string;
  semesterScoreTotals: StudentScoreTotals;
  students: StudentListItem[];
}) {
  const scoreType = getSelectedScoreType();
  const scoreValues = input.students
    .map((student) =>
      getScoreTotal(
        student.id,
        scoreType,
        input.semesterScoreTotals,
        input.annualScoreTotals,
      ),
    )
    .filter(
      (score): score is number =>
        typeof score === "number" && Number.isFinite(score),
    );
  const averageScore = scoreValues.length
    ? Math.round(
        (scoreValues.reduce((sum, score) => sum + score, 0) /
          scoreValues.length) *
          10,
      ) / 10
    : null;
  const data = [
    ["STT", "Mã học sinh", "Họ và tên", "Ngày sinh", "Giới tính", "Điểm"],
    ...input.students.map((student, index) => [
      index + 1,
      student.student_code,
      student.full_name,
      student.date_of_birth ? formatDateVi(student.date_of_birth) : "",
      genderLabel(student.gender),
      getScoreTotal(
        student.id,
        scoreType,
        input.semesterScoreTotals,
        input.annualScoreTotals,
      ) ?? "",
    ]),
    [],
    [`Sĩ số: ${input.students.length} học sinh`, "", "", "", "", ""],
    [
      `Điểm trung bình lớp: ${averageScore == null ? "" : averageScore.toFixed(1)}`,
      "",
      "",
      "",
      "",
      "",
    ],
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:F1");

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      if (!cell) continue;
      cell.s = {
        font: { name: "Times New Roman", sz: 13, bold: row === 0 },
        fill:
          row === 0
            ? { fgColor: { rgb: "D9EAF7" }, patternType: "solid" }
            : undefined,
        alignment: {
          horizontal:
            row === 0 || [0, 1, 3, 4, 5].includes(col) ? "center" : "left",
          vertical: "center",
        },
        border:
          row <= input.students.length
            ? {
                top: { style: "thin", color: { rgb: "808080" } },
                bottom: { style: "thin", color: { rgb: "808080" } },
                left: { style: "thin", color: { rgb: "808080" } },
                right: { style: "thin", color: { rgb: "808080" } },
              }
            : undefined,
      };
    }
  }

  sheet["!cols"] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 35 },
    { wch: 18 },
    { wch: 15 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, "Danh sách học sinh");
  saveExcelFile(
    workbook,
    `Danh_sach_hoc_sinh_${sanitizeFilenamePart(input.className)}_${sanitizeFilenamePart(input.schoolYear)}.xlsx`,
  );
}

export function StudentManagement({
  classId,
  className,
  initialEditId,
  pointTotals,
  schoolYear,
  semesterScoreTotals,
  annualScoreTotals,
  students,
}: StudentManagementProps) {
  const router = useRouter();
  const initialEditStudent = initialEditId
    ? (students.find((student) => student.id === initialEditId) ?? null)
    : null;

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [panel, setPanel] = useState<PanelMode>(
    initialEditStudent ? "edit" : "none",
  );
  const [editingStudent, setEditingStudent] = useState<
    (StudentListItem & { updated_at?: string }) | null
  >(initialEditStudent);
  const [deleteTarget, setDeleteTarget] = useState<StudentListItem | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = query
      ? students.filter(
          (student) =>
            student.full_name.toLowerCase().includes(query) ||
            student.student_code.toLowerCase().includes(query),
        )
      : students;

    return sortMode === "name"
      ? sortStudentsByNameAZ(matches)
      : [...matches].sort((a, b) => compareStudents(a, b, sortMode));
  }, [search, sortMode, students]);

  function openCreate() {
    setPanel("create");
    setEditingStudent(null);
    setError(null);
  }

  function openEdit(student: StudentListItem & { updated_at?: string }) {
    setPanel("edit");
    setEditingStudent(student);
    setError(null);
  }

  function openImport() {
    setPanel("import");
    setEditingStudent(null);
    setError(null);
  }

  function closePanel() {
    setPanel("none");
    setEditingStudent(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;

    startDeleteTransition(async () => {
      const result = await softDeleteStudent(classId, deleteTarget.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
        setFeedback(result.success ?? "Đã đưa học sinh ra khỏi danh sách lớp.");
        setError(null);
      }
      setDeleteTarget(null);
    });
  }

  return (
    <>
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Tìm học sinh"
            className="h-9 pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên hoặc mã học sinh…"
            value={search}
          />
        </div>
        <div
          aria-label="Sắp xếp danh sách học sinh"
          className="grid grid-cols-2 gap-1.5"
          role="group"
        >
          <Button
            aria-pressed={sortMode === "name"}
            className="h-9"
            onClick={() => setSortMode("name")}
            type="button"
            variant={sortMode === "name" ? "secondary" : "outline"}
          >
            <ArrowDownAZ className="size-4" />
            Tên A–Z
          </Button>
          <Button
            aria-pressed={sortMode === "code"}
            className="h-9"
            onClick={() => setSortMode("code")}
            type="button"
            variant={sortMode === "code" ? "secondary" : "outline"}
          >
            <Hash className="size-4" />
            Mã học sinh
          </Button>
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row">
          <Button className="h-9" onClick={openCreate} type="button">
            <UserPlus className="size-4" />
            Thêm học sinh
          </Button>
          <Button
            className="h-9"
            onClick={openImport}
            type="button"
            variant="outline"
          >
            <FileSpreadsheet className="size-4" />
            Import Excel
          </Button>
          <Button
            className="h-9"
            onClick={() =>
              exportStudentsToExcel({
                annualScoreTotals,
                className,
                schoolYear,
                semesterScoreTotals,
                students: filteredStudents,
              })
            }
            type="button"
            variant="outline"
          >
            <Download className="size-4" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {feedback && (
        <p aria-live="polite" className="mb-2 text-sm text-emerald-600">
          {feedback}
        </p>
      )}
      {error && (
        <p aria-live="polite" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {panel === "create" && (
        <div className="mb-3">
          <StudentFormPanel
            classId={classId}
            mode="create"
            onClose={closePanel}
            onSuccess={() => setFeedback("Đã thêm học sinh.")}
          />
        </div>
      )}

      {panel === "edit" && editingStudent && (
        <div className="mb-3">
          <StudentFormPanel
            classId={classId}
            mode="edit"
            onClose={closePanel}
            onSuccess={() => setFeedback("Đã lưu thông tin học sinh.")}
            student={editingStudent}
          />
        </div>
      )}

      {panel === "import" && (
        <div className="mb-3">
          <StudentImportPanel
            classId={classId}
            onClose={closePanel}
            onSuccess={setFeedback}
          />
        </div>
      )}

      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center p-8 text-center">
            <p className="text-lg font-bold">Lớp này chưa có học sinh.</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Thêm từng học sinh hoặc import danh sách từ Excel cho lớp{" "}
              {className}.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button className="h-11" onClick={openCreate} type="button">
                <UserPlus className="size-4" />
                Thêm học sinh
              </Button>
              <Button
                className="h-11"
                onClick={openImport}
                type="button"
                variant="outline"
              >
                <FileSpreadsheet className="size-4" />
                Import Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Không tìm thấy học sinh phù hợp với từ khóa &quot;{search.trim()}
            &quot;.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold">Họ tên</th>
                  <th className="px-3 py-2 text-xs font-semibold">Mã HS</th>
                  <th className="px-3 py-2 text-xs font-semibold">Ngày sinh</th>
                  <th className="px-3 py-2 text-xs font-semibold">Giới tính</th>
                  <th className="px-3 py-2 text-xs font-semibold">Điểm</th>
                  <th className="px-3 py-2 text-xs font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr className="border-t" key={student.id}>
                    <td className="px-3 py-2 font-medium">
                      {student.full_name}
                    </td>
                    <td className="px-3 py-2">{student.student_code}</td>
                    <td className="px-3 py-2">
                      {formatDateVi(student.date_of_birth)}
                    </td>
                    <td className="px-3 py-2">{genderLabel(student.gender)}</td>
                    <td className="px-3 py-2 font-medium">
                      {formatPointsTotal(pointTotals[student.id] ?? 0)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          nativeButton={false}
                          render={
                            <Link
                              href={`/classes/${classId}/students/${student.id}`}
                            />
                          }
                          size="sm"
                          variant="ghost"
                        >
                          <Eye className="size-4" />
                          Xem
                        </Button>
                        <Button
                          onClick={() => openEdit(student)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <Pencil className="size-4" />
                          Sửa
                        </Button>
                        <Button
                          onClick={() => setDeleteTarget(student)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 className="size-4" />
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y rounded-lg border bg-card md:hidden">
            {filteredStudents.map((student) => (
              <div className="px-3 py-2" key={student.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {student.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.student_code} ·{" "}
                      {formatDateVi(student.date_of_birth)} ·{" "}
                      {genderLabel(student.gender)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <Button
                    className="h-8"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/classes/${classId}/students/${student.id}`}
                      />
                    }
                    size="sm"
                    variant="outline"
                  >
                    <Eye className="size-3.5" />
                    Xem
                  </Button>
                  <Button
                    className="h-8"
                    onClick={() => openEdit(student)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Pencil className="size-3.5" />
                    Sửa
                  </Button>
                  <Button
                    className="h-8"
                    onClick={() => setDeleteTarget(student)}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Xóa
                  </Button>
                </div>
                <StudentPointsControls
                  classId={classId}
                  initialTotal={pointTotals[student.id] ?? 0}
                  studentId={student.id}
                  studentName={student.full_name}
                  variant="compact"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {deleteTarget && (
        <dialog
          className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center bg-black/40 p-4 backdrop:bg-black/40"
          open
        >
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-lg">
            <h3 className="text-lg font-bold">Xác nhận xóa học sinh</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bạn có chắc muốn đưa học sinh này ra khỏi danh sách lớp?
            </p>
            <p className="mt-2 font-medium">{deleteTarget.full_name}</p>
            <div className="mt-5 flex gap-3">
              <Button
                className="h-11"
                disabled={isDeleting}
                onClick={handleDelete}
                type="button"
                variant="destructive"
              >
                {isDeleting ? "Đang xóa…" : "Xóa khỏi lớp"}
              </Button>
              <Button
                className="h-11"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                type="button"
                variant="outline"
              >
                Huỷ
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
