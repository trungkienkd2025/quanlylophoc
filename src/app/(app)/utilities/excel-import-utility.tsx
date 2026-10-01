"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type ClassOption = {
  id: string;
  name: string;
  grade: number;
  school_year: string;
};

export function ExcelImportUtility({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");

  function openExcelImport() {
    if (!classId) return;
    router.push(`/classes/${classId}/students?import=1`);
  }

  return (
    <Card className="max-w-2xl border-rose-100 shadow-sm">
      <CardContent className="space-y-5 py-6">
        <div>
          <h2 className="text-lg font-bold">Nhập Excel</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn lớp cần thêm học sinh, sau đó tải file Excel để kiểm tra trước khi nhập.
          </p>
        </div>

        {classes.length > 0 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="excel-import-class">Lớp cần nhập</Label>
              <select
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="excel-import-class"
                onChange={(event) => setClassId(event.target.value)}
                value={classId}
              >
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} · Khối {classItem.grade} · {classItem.school_year}
                  </option>
                ))}
              </select>
            </div>
            <Button className="h-11" onClick={openExcelImport} type="button">
              <FileSpreadsheet className="size-4" />
              Nhập Excel
            </Button>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Chưa có lớp để nhập danh sách học sinh. Hãy tạo lớp trước rồi quay lại đây.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
