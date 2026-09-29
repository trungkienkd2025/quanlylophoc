"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  createStudent,
  updateStudent,
  type ActionState,
} from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GENDER_OPTIONS } from "@/lib/students/format";
import type { StudentGender, StudentListItem } from "@/types/student";

type EditableStudent = Omit<StudentListItem, "homework_status"> & {
  updated_at?: string;
};

type StudentFormPanelProps = {
  classId: string;
  mode: "create" | "edit";
  student?: EditableStudent;
  onClose: () => void;
  onSuccess?: () => void;
};

const initialState: ActionState = {};

export function StudentFormPanel({
  classId,
  mode,
  student,
  onClose,
  onSuccess,
}: StudentFormPanelProps) {
  const router = useRouter();
  const action =
    mode === "create"
      ? createStudent.bind(null, classId)
      : updateStudent.bind(null, classId, student?.id ?? "");

  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess?.();
      onClose();
    }
  }, [state.success, onSuccess, onClose, mode, router]);

  return (
    <form
      action={formAction}
      className="rounded-2xl border bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          {mode === "create" ? "Thêm học sinh" : "Sửa học sinh"}
        </h2>
        <Button onClick={onClose} type="button" variant="ghost">
          Đóng
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="student-full-name">Họ tên *</Label>
          <Input
            className="h-11"
            defaultValue={student?.full_name ?? ""}
            id="student-full-name"
            name="fullName"
            placeholder="Ví dụ: Nguyễn Văn A"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="student-code">Mã học sinh *</Label>
          <Input
            className="h-11"
            defaultValue={student?.student_code ?? ""}
            id="student-code"
            name="studentCode"
            placeholder="Ví dụ: HS001"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="student-dob">Ngày sinh</Label>
          <Input
            className="h-11"
            defaultValue={student?.date_of_birth ?? ""}
            id="student-dob"
            name="dateOfBirth"
            placeholder="YYYY-MM-DD"
            type="date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="student-gender">Giới tính</Label>
          <select
            className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm"
            defaultValue={(student?.gender ?? "UNSPECIFIED") as StudentGender}
            id="student-gender"
            name="gender"
          >
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="student-notes">Ghi chú</Label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base md:text-sm"
            defaultValue={student?.notes ?? ""}
            id="student-notes"
            name="notes"
            placeholder="Ghi chú thêm (không bắt buộc)"
          />
        </div>
      </div>

      {student?.updated_at && (
        <input name="updatedAt" type="hidden" value={student.updated_at} />
      )}

      {state.error && (
        <p aria-live="polite" className="mt-3 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p aria-live="polite" className="mt-3 text-sm text-emerald-600">
          {state.success}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <Button className="h-11" disabled={pending} type="submit">
          {pending ? "Đang lưu…" : mode === "create" ? "Thêm học sinh" : "Lưu thay đổi"}
        </Button>
        <Button className="h-11" onClick={onClose} type="button" variant="outline">
          Huỷ
        </Button>
      </div>
    </form>
  );
}
