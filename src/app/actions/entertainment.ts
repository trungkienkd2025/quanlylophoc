"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { EntertainmentVideo } from "@/types/student-quiz";

type EntertainmentVideoForm = Omit<EntertainmentVideo, "id">;

function isYoutubeUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export async function getEntertainmentVideos(): Promise<EntertainmentVideo[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("entertainment_videos")
    .select("id, title, description, youtube_url, grade, order_index")
    .eq("teacher_id", user.id)
    .order("order_index", { ascending: true });

  if (error || !data) return [];

  return data.map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    youtubeUrl: video.youtube_url,
    grade: video.grade,
    orderIndex: video.order_index,
  }));
}

export async function saveEntertainmentVideo(
  videoId: string | null,
  formData: EntertainmentVideoForm,
): Promise<{ success: boolean; error?: string }> {
  const title = formData.title.trim();
  const description = formData.description.trim();
  const youtubeUrl = formData.youtubeUrl.trim();

  if (!title) return { success: false, error: "Vui lòng nhập tiêu đề video." };
  if (!isYoutubeUrl(youtubeUrl)) return { success: false, error: "Vui lòng nhập liên kết YouTube hợp lệ." };
  if (!Number.isInteger(formData.grade) || formData.grade < 1 || formData.grade > 5) {
    return { success: false, error: "Vui lòng chọn khối lớp từ 1 đến 5." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };

  const payload = {
    title,
    description,
    youtube_url: youtubeUrl,
    grade: formData.grade,
    order_index: Math.max(1, Math.floor(formData.orderIndex || 1)),
    teacher_id: user.id,
  };
  const { error } = videoId
    ? await supabase.from("entertainment_videos").update(payload).eq("id", videoId).eq("teacher_id", user.id)
    : await supabase.from("entertainment_videos").insert(payload);

  if (error) return { success: false, error: "Không thể lưu video giải trí. Vui lòng thử lại." };

  revalidatePath("/entertainment");
  return { success: true };
}

export async function deleteEntertainmentVideo(videoId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };

  const { error } = await supabase
    .from("entertainment_videos")
    .delete()
    .eq("id", videoId)
    .eq("teacher_id", user.id);
  if (error) return { success: false, error: "Không thể xoá video giải trí. Vui lòng thử lại." };

  revalidatePath("/entertainment");
  return { success: true };
}
