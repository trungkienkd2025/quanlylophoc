"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, Edit2, ExternalLink, Gamepad2, Plus, Search, Trash2 } from "lucide-react";

import { deleteEntertainmentVideo, saveEntertainmentVideo } from "@/app/actions/entertainment";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EntertainmentVideo } from "@/types/student-quiz";

type Props = { initialVideos: EntertainmentVideo[] };

function getEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    let id = "";
    if (url.hostname.includes("youtu.be")) id = url.pathname.slice(1);
    else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] || "";
    else id = url.searchParams.get("v") || "";
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  } catch {
    return null;
  }
}

export function EntertainmentClient({ initialVideos }: Props) {
  const [videos, setVideos] = useState(initialVideos);
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<number | "all">("all");
  const [editing, setEditing] = useState<EntertainmentVideo | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredVideos = useMemo(() => videos
    .filter((video) => grade === "all" || video.grade === grade)
    .filter((video) => {
      const value = query.trim().toLocaleLowerCase("vi");
      return !value || video.title.toLocaleLowerCase("vi").includes(value) || video.description.toLocaleLowerCase("vi").includes(value);
    })
    .sort((a, b) => (a.orderIndex ?? 1) - (b.orderIndex ?? 1)), [videos, grade, query]);

  function openNew() {
    setEditing({ title: "", description: "", youtubeUrl: "", grade: 4, orderIndex: videos.length + 1 });
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isPending) return;
    setIsFormOpen(false);
    setEditing(null);
    setError(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    startTransition(async () => {
      const result = await saveEntertainmentVideo(editing.id ?? null, editing);
      if (!result.success) {
        setError(result.error || "Không thể lưu video giải trí. Vui lòng thử lại.");
        return;
      }
      if (editing.id) {
        setVideos((current) => current.map((video) => video.id === editing.id ? editing : video));
      } else {
        window.location.reload();
        return;
      }
      closeForm();
    });
  }

  function remove(video: EntertainmentVideo) {
    if (!video.id || !confirm(`Bạn có chắc chắn muốn xoá “${video.title}”?`)) return;
    startTransition(async () => {
      const result = await deleteEntertainmentVideo(video.id!);
      if (result.success) setVideos((current) => current.filter((item) => item.id !== video.id));
      else alert(result.error || "Không thể xoá video giải trí. Vui lòng thử lại.");
    });
  }

  return <div className="space-y-6">
    <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"><ChevronLeft className="size-4" />Quay lại</Link>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900"><Gamepad2 className="size-6 text-indigo-600" />Quản lý Giải trí</h1><p className="mt-1 text-sm text-muted-foreground">Quản lý liên kết video YouTube cho các hoạt động thư giãn và trò chơi học tập.</p></div>
      <Button onClick={openNew} className="rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700"><Plus className="mr-1.5 size-4" />Thêm video mới</Button>
    </div>
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">{(["all", 1, 2, 3, 4, 5] as const).map((item) => <Button key={item} variant={grade === item ? "default" : "outline"} size="sm" onClick={() => setGrade(item)} className="rounded-full text-xs font-bold">{item === "all" ? "Tất cả Khối" : `Khối ${item}`}</Button>)}</div>
      <div className="relative w-full sm:max-w-xs"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tiêu đề, mô tả..." className="h-9 rounded-xl pl-9 text-xs font-bold" /></div>
    </div>
    {filteredVideos.length === 0 ? <Card className="rounded-3xl border-2 border-dashed border-slate-200 py-12 text-center text-muted-foreground shadow-none"><CardContent>Chưa có video giải trí nào. Hãy thêm liên kết YouTube đầu tiên.</CardContent></Card> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filteredVideos.map((video) => <Card key={video.id} className="flex flex-col justify-between overflow-hidden shadow-sm transition-all hover:border-indigo-300 hover:shadow"><CardContent className="space-y-3 p-4"><div className="aspect-video overflow-hidden rounded-xl border bg-slate-100">{getEmbedUrl(video.youtubeUrl) ? <iframe src={getEmbedUrl(video.youtubeUrl)!} title={video.title} className="size-full" allowFullScreen /> : null}</div><div className="space-y-1"><div className="flex flex-wrap gap-1.5"><span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">Thứ tự: {video.orderIndex ?? 1}</span><span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-indigo-800">Khối {video.grade ?? 4}</span></div><h2 className="line-clamp-1 text-base font-bold leading-snug text-slate-900">{video.title}</h2><p className="line-clamp-2 text-xs font-normal text-muted-foreground">{video.description || "Chưa có mô tả."}</p></div></CardContent><div className="flex items-center justify-between border-t border-slate-50 px-4 pt-2 pb-4"><a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">Xem trên YouTube <ExternalLink className="size-3" /></a><div className="flex gap-1.5"><Button variant="ghost" size="icon" className="size-7 rounded-lg text-slate-600" onClick={() => { setEditing(video); setError(null); setIsFormOpen(true); }} disabled={isPending}><Edit2 className="size-3.5" /></Button><Button variant="ghost" size="icon" className="size-7 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => remove(video)} disabled={isPending}><Trash2 className="size-3.5" /></Button></div></div></Card>)}</div>}
    {isFormOpen && editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border-indigo-100 bg-white shadow-2xl"><div className="bg-indigo-600 p-5 text-white"><h2 className="text-lg font-extrabold">{editing.id ? "Chỉnh sửa video giải trí" : "Thêm video giải trí mới"}</h2><p className="mt-1 text-xs text-indigo-100">Chia sẻ video YouTube phù hợp cho học sinh.</p></div><form onSubmit={submit} className="space-y-4 p-6">{error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</p>}<div className="space-y-2"><Label htmlFor="entertainment-title" className="font-bold">Tiêu đề video</Label><Input id="entertainment-title" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} placeholder="Ví dụ: Trò chơi khởi động vui nhộn" required /></div><div className="space-y-2"><Label htmlFor="entertainment-description" className="font-bold">Mô tả ngắn</Label><textarea id="entertainment-description" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="Nhập mô tả ngắn gọn..." className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div><div className="space-y-2"><Label htmlFor="entertainment-youtube" className="font-bold">Liên kết YouTube</Label><Input id="entertainment-youtube" type="url" value={editing.youtubeUrl} onChange={(event) => setEditing({ ...editing, youtubeUrl: event.target.value })} placeholder="https://www.youtube.com/watch?v=..." required /><p className="text-[10px] font-normal text-muted-foreground">Dán liên kết YouTube để hiển thị video trực tiếp trên trang.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="entertainment-grade" className="font-bold">Khối lớp</Label><select id="entertainment-grade" value={editing.grade} onChange={(event) => setEditing({ ...editing, grade: Number(event.target.value) })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold">{[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>Khối {item}</option>)}</select></div><div className="space-y-2"><Label htmlFor="entertainment-order" className="font-bold">Thứ tự hiển thị</Label><Input id="entertainment-order" type="number" min={1} value={editing.orderIndex} onChange={(event) => setEditing({ ...editing, orderIndex: Number(event.target.value) || 1 })} required /></div></div><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={closeForm} disabled={isPending} className="rounded-xl">Huỷ</Button><Button type="submit" disabled={isPending} className="rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700">{isPending ? "Đang lưu..." : "Lưu video"}</Button></div></form></Card></div>}
  </div>;
}
