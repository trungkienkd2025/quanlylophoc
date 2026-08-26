"use client";

import { FormEvent, useState, useTransition } from "react";
import { CheckCircle2, Play, Plus, X } from "lucide-react";

import { createEntertainmentVideo } from "@/app/actions/entertainment";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EntertainmentVideo } from "@/types/entertainment";

interface EntertainmentClientProps {
  initialVideos: EntertainmentVideo[];
}

export function EntertainmentClient({ initialVideos }: EntertainmentClientProps) {
  const [videos, setVideos] = useState(initialVideos);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeForm() {
    if (isPending) return;
    setIsFormOpen(false);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createEntertainmentVideo({ title, description, youtubeUrl });
      if (!result.success) {
        setError(result.error);
        return;
      }

      setVideos((currentVideos) => [result.video, ...currentVideos]);
      setTitle("");
      setDescription("");
      setYoutubeUrl("");
      setIsFormOpen(false);
    });
  }

  return (
    <>
      <section className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Video giải trí cho lớp</h2>
            <p className="mt-1 text-sm text-slate-600">
              Thêm video YouTube phù hợp để cả lớp cùng thư giãn sau giờ học.
            </p>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="rounded-xl bg-amber-500 text-white hover:bg-amber-600"
          >
            <Plus className="size-4" />
            Thêm video YouTube
          </Button>
        </div>
      </section>

      {videos.length === 0 ? (
        <Card className="border-amber-100 bg-white shadow-sm" size="sm">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-600">
              <Play className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Chưa có video giải trí</h2>
              <p className="text-sm text-slate-600">Nhấn “Thêm video YouTube” để chia sẻ video đầu tiên với lớp.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden border-amber-100 bg-white shadow-sm">
              <div className="aspect-video bg-slate-100">
                <iframe
                  className="size-full"
                  src={video.youtubeUrl}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <CardContent className="space-y-1 p-4">
                <h2 className="font-bold text-slate-900">{video.title}</h2>
                <p className="text-sm text-slate-600">{video.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-video-title">
          <Card className="w-full max-w-lg overflow-hidden border-amber-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-amber-500 p-5 text-white">
              <div>
                <h2 id="add-video-title" className="text-lg font-bold">Thêm video YouTube</h2>
                <p className="mt-1 text-sm text-amber-50">Điền tên, mô tả và liên kết video để chia sẻ với lớp.</p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" className="text-white hover:bg-white/20 hover:text-white" onClick={closeForm} aria-label="Đóng biểu mẫu">
                <X className="size-4" />
              </Button>
            </div>
            <form className="space-y-4 p-5" onSubmit={handleSubmit}>
              {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="entertainment-video-title">Tên video</Label>
                <Input id="entertainment-video-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Cùng hát và vận động" maxLength={160} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entertainment-video-description">Mô tả video</Label>
                <textarea id="entertainment-video-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Video giúp các em thư giãn trong giờ giải lao..." maxLength={500} required className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entertainment-youtube-url">Liên kết YouTube</Label>
                <Input id="entertainment-youtube-url" type="url" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." required />
                <p className="text-xs text-slate-500">Hỗ trợ liên kết youtube.com, youtu.be, video ngắn và liên kết nhúng.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeForm} disabled={isPending}>Hủy</Button>
                <Button type="submit" disabled={isPending} className="bg-amber-500 text-white hover:bg-amber-600">
                  {isPending ? "Đang lưu..." : <><CheckCircle2 className="size-4" /> Lưu video</>}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
