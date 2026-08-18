"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Home,
  UsersRound,
} from "lucide-react";
import { softDeleteClass, updateClass, type ClassMutationState } from "@/app/actions/classes";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type SidebarClassItem = {
  id: string;
  name: string;
  school_year: string;
  school_year_id: string | null;
  grade: number;
};

export type SidebarYearItem = {
  id: string;
  name: string;
  classes: SidebarClassItem[];
};

const YEARS_SECTION_KEY = "qllh.sidebar.yearsSectionOpen";

function readYearsSectionOpen(fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(YEARS_SECTION_KEY);
    if (raw === "0") return false;
    if (raw === "1") return true;
  } catch {
    // ignore
  }
  return fallback;
}

function persistYearsSectionOpen(open: boolean) {
  try {
    localStorage.setItem(YEARS_SECTION_KEY, open ? "1" : "0");
  } catch {
    // ignore
  }
}

function classQuickLinks(classId: string) {
  return [
    { href: `/classes/${classId}`, icon: ClipboardCheck, label: "Tuần" },
    { href: `/classes/${classId}/students`, icon: UsersRound, label: "Học sinh" },
    { href: `/classes/${classId}/scores`, icon: GraduationCap, label: "Điểm" },
  ];
}

export function AppShell({
  children,
  fullName,
  teacherCode,
  years,
}: {
  children: React.ReactNode;
  fullName: string;
  teacherCode?: string;
  years: SidebarYearItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeClassId = pathname.match(/^\/classes\/([^/]+)/)?.[1] ?? null;
  const [editClass, setEditClass] = useState<SidebarClassItem | null>(null);
  const [deleteClass, setDeleteClass] = useState<SidebarClassItem | null>(null);
  const [editState, setEditState] = useState<ClassMutationState>({});
  const [isPending, startTransition] = useTransition();
  const [isMobileYearsOpen, setIsMobileYearsOpen] = useState(false);

  useEffect(() => {
    setIsMobileYearsOpen(false);
  }, [pathname]);

  const yearContainingActive = useMemo(() => {
    if (!activeClassId) return null;
    return (
      years.find((year) => year.classes.some((classItem) => classItem.id === activeClassId))?.id ??
      null
    );
  }, [activeClassId, years]);

  const [yearsSectionOpen, setYearsSectionOpen] = useState(
    Boolean(yearContainingActive) || years.length > 0
  );

  // Đang ở trang lớp → luôn mở mục Năm học để giáo viên không bị lạc.
  const visibleYearsSectionOpen = yearsSectionOpen || Boolean(yearContainingActive);

  function submitEdit(formData: FormData) {
    startTransition(async () => {
      const result = await updateClass({}, formData);
      setEditState(result);
      if (!result.error) {
        setEditClass(null);
        router.refresh();
      }
    });
  }

  // Confirm delete class
  function confirmDelete() {
    if (!deleteClass) return;
    startTransition(async () => {
      await softDeleteClass(deleteClass.id);
    });
  }

  const mobileNav = activeClassId
    ? [
      { href: "/dashboard", icon: Home, label: "Trang chủ" },
      { href: `/classes/${activeClassId}`, icon: ClipboardCheck, label: "Tuần" },
      { href: `/classes/${activeClassId}/students`, icon: UsersRound, label: "Học sinh" },
      { href: `/classes/${activeClassId}/scores`, icon: GraduationCap, label: "Điểm" },
    ]
    : [
      { href: "/dashboard", icon: Home, label: "Trang chủ" },
      { href: "#", icon: BookOpen, label: "Năm học", onClick: () => setIsMobileYearsOpen(true) },
      { href: "/reports", icon: BarChart3, label: "Báo cáo" },
    ];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 hidden w-64 border-r bg-card p-4 md:flex md:flex-col">
        <Link className="mb-5 text-lg font-bold text-primary" href="/dashboard">
          QLLH
        </Link>

        <nav aria-label="Menu chính" className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            <Link
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-blue-900 hover:bg-sky-50 hover:text-blue-900",
                pathname === "/dashboard" && "bg-sky-50 text-blue-900",
              )}
              href="/dashboard"
            >
              <Home aria-hidden="true" className="size-4" />
              Trang chủ
            </Link>

            <div>
              <button
                aria-expanded={visibleYearsSectionOpen}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-blue-900 hover:bg-sky-50 hover:text-blue-900",
                  visibleYearsSectionOpen && "bg-sky-50/70 text-blue-900",
                )}
                onClick={() => {
                  const next = !visibleYearsSectionOpen;
                  setYearsSectionOpen(next);
                  persistYearsSectionOpen(next);
                }}
                type="button"
              >
                <BookOpen aria-hidden="true" className="size-4 shrink-0" />
                <span className="flex-1 text-left">Năm học</span>
                {visibleYearsSectionOpen ? (
                  <ChevronDown className="size-4 shrink-0 text-blue-900" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-blue-900" />
                )}
              </button>

              {visibleYearsSectionOpen ? (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l pl-2">
                  {years.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">Chưa có năm học.</p>
                  ) : (
                    years.map((year) => {
                      const activeClassInYear = year.classes.find(
                        (classItem) => classItem.id === activeClassId,
                      );
                      return (
                        <div className="space-y-1 rounded-lg px-2 py-1" key={year.id}>
                          <div className="flex items-center gap-1.5 text-sm font-semibold">
                            <span className="truncate">{year.name}</span>
                            <span className="ml-auto text-[10px] font-medium text-muted-foreground">
                              {year.classes.length}
                            </span>
                          </div>

                          {year.classes.length === 0 ? (
                            <p className="py-1 text-xs text-muted-foreground">Chưa có lớp</p>
                          ) : (
                            <>
                              <select
                                aria-label={`Chọn lớp năm học ${year.name}`}
                                className={cn(
                                  "h-9 w-full rounded-lg border bg-background px-2 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
                                  activeClassInYear && "border-primary text-primary",
                                )}
                                onChange={(event) => {
                                  const classId = event.target.value;
                                  if (classId) router.push(`/classes/${classId}`);
                                }}
                                value={activeClassInYear?.id ?? ""}
                              >
                                <option value="">Chọn lớp</option>
                                {year.classes.map((classItem) => (
                                  <option key={classItem.id} value={classItem.id}>
                                    {classItem.name} · Khối {classItem.grade}
                                  </option>
                                ))}
                              </select>

                              {activeClassInYear ? (
                                <div className="space-y-1">
                                  <div className="flex gap-1">
                                    <Button
                                      className="h-7 flex-1 px-2 text-xs"
                                      onClick={() => {
                                        setEditClass(activeClassInYear);
                                        setEditState({});
                                      }}
                                      type="button"
                                      variant="outline"
                                    >
                                      Sửa lớp
                                    </Button>
                                    <Button
                                      className="h-7 flex-1 px-2 text-xs"
                                      onClick={() => {
                                        setDeleteClass(activeClassInYear);
                                      }}
                                      type="button"
                                      variant="outline"
                                    >
                                      Xóa lớp
                                    </Button>
                                  </div>

                                  {activeClassInYear ? (
                                    <div className="space-y-0.5 border-l pl-2">
                                      {classQuickLinks(activeClassInYear.id).map(
                                        ({ href, icon: Icon, label }) => {
                                          const isActive =
                                            href === `/classes/${activeClassInYear.id}`
                                              ? pathname === href || pathname.startsWith(`${href}?`)
                                              : pathname.startsWith(href);
                                          return (
                                            <Link
                                              className={cn(
                                                "flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-sky-50 hover:text-primary",
                                                isActive && "bg-sky-50 text-primary",
                                              )}
                                              href={href}
                                              key={label}
                                            >
                                              <Icon className="size-3.5" />
                                              {label}
                                            </Link>
                                          );
                                        },
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>

            <Link
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-blue-900 hover:bg-sky-50 hover:text-blue-900",
                pathname.startsWith("/reports") && "bg-sky-50 text-blue-900",
              )}
              href="/reports"
            >
              <BarChart3 className="size-4" />
              Báo cáo
            </Link>

            <div className="mt-3 rounded-2xl border border-sky-100 bg-white p-2 shadow-sm">
              <img
                alt="Minh hoạ giáo viên quản lý báo cáo học sinh"
                className="h-auto w-full rounded-xl object-cover"
                src="/sidebar-report-illustration.svg"
              />
            </div>
          </div>

          <div className="mt-3 shrink-0 rounded-lg bg-sky-50 p-2.5">
            {teacherCode && (
              <div className="border-b border-sky-100 pb-2 mb-2 shrink-0">
                <p className="text-[20px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Mã phòng học</p>
                <p className="text-[20px] font-black text-primary select-all bg-white border border-sky-150 py-1 rounded-xl text-center shadow-sm tracking-widest leading-none">
                  {teacherCode}
                </p>
              </div>
            )}
            <p className="text-sm font-semibold">{fullName}</p>
            <form action={logout}>
              <Button className="mt-1 h-7 px-0 text-muted-foreground" size="sm" type="submit" variant="ghost">
                Đăng xuất
              </Button>
            </form>
          </div>
        </nav>
      </aside>

      <main className="mx-auto min-h-screen max-w-5xl px-3 pb-20 pt-4 md:ml-64 md:max-w-none md:px-6 md:py-6">
        {children}
      </main>

      <nav
        aria-label="Điều hướng di động"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card px-0.5 py-0.5 shadow-lg md:hidden"
      >
        {mobileNav.map(({ href, icon: Icon, label, onClick }) => {
          if (onClick) {
            return (
              <button
                key={label}
                onClick={onClick}
                type="button"
                className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium text-blue-900 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <Icon aria-hidden="true" className="size-4" />
                <span className="truncate">{label}</span>
              </button>
            );
          }
          return (
            <Link
              className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium text-blue-900 hover:bg-slate-50 transition-colors"
              href={href}
              key={label}
            >
              <Icon aria-hidden="true" className="size-4" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {isMobileYearsOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden animate-in fade-in duration-200" onClick={() => setIsMobileYearsOpen(false)}>
          <div
            className="fixed inset-y-0 right-0 w-80 bg-white p-5 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <h3 className="font-extrabold text-slate-800 text-base">Năm học & Lớp học</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileYearsOpen(false)}
                  className="font-bold text-slate-500 rounded-lg px-2 h-8"
                >
                  Đóng
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {years.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground font-normal">Chưa có năm học.</p>
                ) : (
                  years.map((year) => {
                    const activeClassInYear = year.classes.find(
                      (classItem) => classItem.id === activeClassId,
                    );
                    return (
                      <div className="space-y-1 rounded-lg px-3 py-2 border bg-slate-50/50" key={year.id}>
                        <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-800">
                          <span className="truncate">{year.name}</span>
                          <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-slate-200/60 px-1.5 py-0.5 rounded-md">
                            {year.classes.length} lớp
                          </span>
                        </div>

                        {year.classes.length === 0 ? (
                          <p className="py-1 text-xs text-muted-foreground font-normal">Chưa có lớp</p>
                        ) : (
                          <select
                            aria-label={`Chọn lớp năm học ${year.name}`}
                            className={cn(
                              "h-9 w-full rounded-lg border bg-background px-2 text-xs font-bold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
                              activeClassInYear && "border-primary text-primary",
                            )}
                            onChange={(event) => {
                              const classId = event.target.value;
                              if (classId) {
                                router.push(`/classes/${classId}`);
                                setIsMobileYearsOpen(false);
                              }
                            }}
                            value={activeClassInYear?.id ?? ""}
                          >
                            <option value="">Chọn lớp</option>
                            {year.classes.map((classItem) => (
                              <option key={classItem.id} value={classItem.id}>
                                {classItem.name} · Khối {classItem.grade}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-3 flex-shrink-0">
              <p className="text-xs text-muted-foreground font-normal text-center">Đang đăng nhập: {fullName}</p>
            </div>
          </div>
        </div>
      )}

      {editClass ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            action={submitEdit}
            className="w-full max-w-md space-y-3 rounded-xl border bg-card p-4 shadow-xl"
          >
            <h2 className="text-lg font-bold">Sửa lớp</h2>
            <input name="classId" type="hidden" value={editClass.id} />
            <div className="space-y-1">
              <Label htmlFor="edit-class-name">Tên lớp</Label>
              <Input
                defaultValue={editClass.name}
                id="edit-class-name"
                name="name"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-class-grade">Khối</Label>
              <Input
                defaultValue={editClass.grade}
                id="edit-class-grade"
                max={12}
                min={1}
                name="grade"
                required
                type="number"
              />
            </div>
            {editState.error ? (
              <p className="text-sm text-destructive">{editState.error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditClass(null)} type="button" variant="outline">
                Huỷ
              </Button>
              <Button disabled={isPending} type="submit">
                {isPending ? "Đang lưu…" : "Lưu"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteClass ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-xl border bg-card p-4 shadow-xl">
            <h2 className="text-lg font-bold">Xóa lớp {deleteClass.name}?</h2>
            <p className="text-sm text-muted-foreground">
              Bạn có chắc muốn xóa lớp này? Dữ liệu học sinh, điểm danh, đánh giá và điểm của lớp sẽ
              không còn hiện trong danh sách (xóa mềm). Năm học khác không bị ảnh hưởng.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDeleteClass(null)} type="button" variant="outline">
                Huỷ
              </Button>
              <Button disabled={isPending} onClick={confirmDelete} type="button" variant="destructive">
                {isPending ? "Đang xóa…" : "Xóa lớp"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
