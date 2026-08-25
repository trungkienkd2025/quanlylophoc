import Link from "next/link";
import { ArrowLeft, Gamepad2, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export default function EntertainmentPage() {
  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        Trang chủ
      </Link>

      <header className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-amber-500 text-white">
          <Gamepad2 className="size-7" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Khu vực lớp học
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-amber-950">
          Giải trí
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Trang dành cho các hoạt động thư giãn, trò chơi học tập và nội dung vui
          nhộn sau giờ học. Các mục khác trên trang chủ vẫn được giữ nguyên.
        </p>
      </header>

      <Card className="border-amber-100 bg-white shadow-sm" size="sm">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-600">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Nội dung giải trí sẽ được cập nhật
            </h2>
            <p className="text-sm text-slate-600">
              Giáo viên có thể quay lại trang chủ để tiếp tục quản lý lớp học,
              câu hỏi trắc nghiệm hoặc học liệu số.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
