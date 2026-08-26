"use server";

import { revalidatePath } from "next/cache";

import { normalizeYouTubeUrl, entertainmentVideoSchema } from "@/lib/entertainment/validation";
import { createClient } from "@/lib/supabase/server";
import { ensureTeacherProfile } from "@/lib/supabase/profile";
import type { EntertainmentVideo } from "@/types/entertainment";

export async function getEntertainmentVideos(): Promise<EntertainmentVideo[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("entertainment_videos")
      .select("id, title, description, youtube_url, created_at")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((video) => ({
      id: video.id,
      title: video.title,
      description: video.description,
      youtubeUrl: video.youtube_url,
      createdAt: video.created_at,
    }));
  } catch {
    return [];
  }
}

export async function createEntertainmentVideo(input: {
  title: string;
  description: string;
  youtubeUrl: string;
}): Promise<{ success: true; video: EntertainmentVideo } | { success: false; error: string }> {
  const parsed = entertainmentVideoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin video." };
  }

  try {
    const youtubeUrl = normalizeYouTubeUrl(parsed.data.youtubeUrl);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };

    // Older Supabase projects can have authenticated teachers that predate the
    // profile trigger. The video table references profiles, so create that
    // missing record before inserting instead of failing with a foreign-key
    // error after the teacher has completed the form.
    const profileResult = await ensureTeacherProfile(supabase, user);
    if (profileResult.error) {
      console.error("Unable to ensure teacher profile for entertainment video");
      return {
        success: false,
        error: "Chưa thể thiết lập hồ sơ giáo viên. Vui lòng thử lại.",
      };
    }

    const { data, error } = await supabase
      .from("entertainment_videos")
      .insert({
        teacher_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        youtube_url: youtubeUrl,
      })
      .select("id, title, description, youtube_url, created_at")
      .single();

    if (error || !data) {
      // An existing Supabase project may not have received the forward-only
      // entertainment_videos patch yet. Keep database details out of the UI,
      // while making this deployment issue actionable for the teacher.
      if (error?.code === "42P01" || error?.code === "42501") {
        return {
          success: false,
          error: "Chức năng lưu video chưa sẵn sàng. Vui lòng báo quản trị viên cập nhật hệ thống.",
        };
      }

      console.error("Unable to save entertainment video", { code: error?.code });
      return { success: false, error: "Không thể lưu video. Vui lòng thử lại." };
    }

    revalidatePath("/entertainment");
    return {
      success: true,
      video: {
        id: data.id,
        title: data.title,
        description: data.description,
        youtubeUrl: data.youtube_url,
        createdAt: data.created_at,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      success: false,
      error: message.startsWith("Vui lòng") ? message : "Không thể lưu video. Vui lòng thử lại.",
    };
  }
}
