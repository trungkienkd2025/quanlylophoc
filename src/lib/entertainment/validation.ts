import { z } from "zod";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export const entertainmentVideoSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên video.").max(160),
  description: z.string().trim().min(1, "Vui lòng nhập mô tả video.").max(500),
  youtubeUrl: z.string().trim().url("Vui lòng nhập liên kết YouTube hợp lệ."),
});

export function normalizeYouTubeUrl(value: string) {
  const url = new URL(value.trim());
  const host = url.hostname.toLowerCase();

  if (!YOUTUBE_HOSTS.has(host)) {
    throw new Error("Vui lòng chỉ sử dụng liên kết YouTube.");
  }

  let videoId: string | null = null;
  if (host.endsWith("youtu.be")) {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
    videoId = url.pathname.split("/").filter(Boolean)[1] ?? null;
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error("Liên kết YouTube chưa có mã video hợp lệ.");
  }

  return `https://www.youtube.com/embed/${videoId}`;
}
