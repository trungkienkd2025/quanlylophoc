import Link from "next/link";
import { Gamepad2, GraduationCap, UsersRound, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, teacher_code").eq("id", user.id).maybeSingle()
    : { data: null };

  const displayName =
    profile?.full_name || user?.user_metadata.full_name || "Giáo viên";

  return (
    <>
      <header className="mb-4">
        <p className="text-sm text-muted-foreground">Xin chào,</p>
        <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn khu vực cần quản lý để bắt đầu công việc trong lớp.
        </p>
        {profile?.teacher_code && (
          <div className="bg-sky-55/80 bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3 flex flex-col items-center justify-center shrink-0 self-start sm:self-auto shadow-sm">
            <span className="text-[10px] uppercase font-extrabold text-sky-600 tracking-wider">Mã phòng học</span>
            <span className="text-xl font-black text-sky-850 tracking-wider mt-0.5 select-all">{profile.teacher_code}</span>
          </div>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/class-management" className="block">
          <Card
            className="h-full border-sky-200 bg-gradient-to-br from-sky-100 via-white to-sky-50 shadow-sm transition hover:border-sky-300 hover:shadow-md cursor-pointer"
            size="sm"
          >
            <CardContent className="flex items-center gap-4 py-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-500 text-white">
                <UsersRound className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-sky-950">
                  Quản lý lớp học
                </h2>
                <p className="text-xs text-muted-foreground font-normal text-slate-600">
                  Quản lý học sinh, điểm danh, phát biểu và điểm thi đua
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/quiz-management" className="block">
          <Card
            className="h-full border-emerald-200 bg-gradient-to-br from-emerald-100 via-white to-teal-50 shadow-sm transition hover:border-emerald-300 hover:shadow-md cursor-pointer"
            size="sm"
          >
            <CardContent className="flex items-center gap-4 py-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white">
                <GraduationCap className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-emerald-950">
                  Câu hỏi trắc nghiệm
                </h2>
                <p className="text-xs text-muted-foreground font-normal text-slate-600">
                  Quản lý ngân hàng câu hỏi trắc nghiệm Tin học
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/learning-materials" className="block">
          <Card
            className="h-full border-violet-200 bg-gradient-to-br from-violet-100 via-white to-indigo-50 shadow-sm transition hover:border-violet-300 hover:shadow-md cursor-pointer"
            size="sm"
          >
            <CardContent className="flex items-center gap-4 py-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-500 text-white">
                <Video className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-violet-950">
                  Học liệu số
                </h2>
                <p className="text-xs text-muted-foreground font-normal text-slate-600">
                  Quản lý liên kết video bài giảng theo khối lớp 1–5
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/entertainment" className="block">
          <Card
            className="h-full border-amber-200 bg-gradient-to-br from-amber-100 via-white to-orange-50 shadow-sm transition hover:border-amber-300 hover:shadow-md cursor-pointer"
            size="sm"
          >
            <CardContent className="flex items-center gap-4 py-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white">
                <Gamepad2 className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-amber-950">
                  Giải trí
                </h2>
                <p className="text-xs text-muted-foreground font-normal text-slate-600">
                  Không gian trò chơi và hoạt động thư giãn cho lớp học
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </>
  );
}
