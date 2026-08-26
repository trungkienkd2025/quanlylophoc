import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";

import { getEntertainmentVideos } from "@/app/actions/entertainment";
import { EntertainmentClient } from "./entertainment-client";

export default async function EntertainmentPage() {
  const videos = await getEntertainmentVideos();

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

      <EntertainmentClient initialVideos={videos} />
    </div>
  );
}
