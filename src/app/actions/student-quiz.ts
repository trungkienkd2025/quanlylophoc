"use server";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_QUIZ_QUESTIONS, STATIC_VIDEOS } from "@/lib/student-quiz-data";
import { QuizQuestion, QuizSubmission, LessonVideo } from "@/types/student-quiz";
import { revalidatePath } from "next/cache";

const ATTACHMENT_FILE_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/pdf",
]);

const THUMBNAIL_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const EMPTY_FILE_SIZE = 0;

function sanitizeBlobPathPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "file";
}

async function uploadToVercelBlob(file: File, prefix: string, userId: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("Missing Vercel Blob token");
  }

  const pathname = [
    "learning-materials",
    userId,
    prefix,
    `${Date.now()}-${crypto.randomUUID()}-${sanitizeBlobPathPart(file.name)}`,
  ].join("/");

  const response = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-vercel-blob-add-random-suffix": "0",
      "x-vercel-blob-access": "public",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Blob upload failed");
  }

  const data = await response.json() as { url?: string; downloadUrl?: string; pathname?: string };
  if (!data.url) {
    throw new Error("Blob upload response invalid");
  }

  return data.url;
}

async function deleteFromVercelBlob(urls: Array<string | null | undefined>) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const validUrls = urls.filter((url): url is string => Boolean(url));
  if (!token || validUrls.length === 0) return;

  await fetch("https://blob.vercel-storage.com", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urls: validUrls }),
  }).catch(() => undefined);
}

// Tải danh sách câu hỏi trắc nghiệm (nếu lỗi hoặc bảng trống, trả về bộ 10 câu mặc định)
export async function getQuizQuestions(grade?: number, includeInactive = false, teacherId?: string): Promise<QuizQuestion[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("quiz_questions")
      .select("*");
    
    if (grade !== undefined) {
      query = query.eq("grade", grade);
    }
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    let targetTeacherId = teacherId;
    if (!targetTeacherId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        targetTeacherId = user.id;
      }
    }

    if (targetTeacherId) {
      query = query.eq("teacher_id", targetTeacherId);
    } else {
      query = query.is("teacher_id", null);
    }

    const { data, error } = await query.order("order_index", { ascending: true });

    if (error || !data || data.length === 0) {
      if (grade === undefined || grade === 4) {
        return DEFAULT_QUIZ_QUESTIONS;
      }
      return [];
    }

    interface DbQuizQuestion {
      id: string;
      question: string;
      options: string[];
      correct_answer: number;
      explanation: string;
      order_index: number;
      grade: number;
      is_active: boolean;
      teacher_id?: string;
    }

    return (data as DbQuizQuestion[]).map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      order_index: q.order_index,
      grade: q.grade,
      is_active: q.is_active,
      teacher_id: q.teacher_id,
    }));
  } catch {
    return grade === undefined || grade === 4 ? DEFAULT_QUIZ_QUESTIONS : [];
  }
}

// Lưu kết quả làm bài của học sinh (cho phép nộp ẩn danh)
export async function submitQuizResult(
  studentName: string,
  className: string,
  score: number,
  totalQuestions: number,
  teacherId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("quiz_submissions").insert({
      student_name: studentName,
      class_name: className,
      score,
      total_questions: totalQuestions,
      teacher_id: teacherId || null
    });
    if (error) throw error;
    
    revalidatePath("/quiz-management");
    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Không thể gửi kết quả làm bài.";
    return { success: false, error: errMsg };
  }
}

// Tải toàn bộ kết quả làm bài của học sinh (chỉ giáo viên đã đăng nhập)
export async function getQuizSubmissions(): Promise<QuizSubmission[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("quiz_submissions")
      .select("*")
      .eq("teacher_id", user.id)
      .order("completed_at", { ascending: false });

    if (error || !data) return [];

    interface DbQuizSubmission {
      id: string;
      student_name: string;
      class_name: string;
      score: number;
      total_questions: number;
      completed_at: string;
      teacher_id?: string;
    }

    return (data as DbQuizSubmission[]).map((s) => ({
      id: s.id,
      student_name: s.student_name,
      class_name: s.class_name,
      score: s.score,
      total_questions: s.total_questions,
      completed_at: s.completed_at,
      teacher_id: s.teacher_id,
    }));
  } catch {
    return [];
  }
}

// Thêm hoặc cập nhật câu hỏi trắc nghiệm (yêu cầu giáo viên)
export async function updateQuizQuestion(
  questionId: string | null,
  formData: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    orderIndex?: number;
    grade: number;
    is_active?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };

    const payload = {
      question: formData.question.trim(),
      options: formData.options.map(opt => opt.trim()),
      correct_answer: formData.correctAnswer,
      explanation: formData.explanation.trim(),
      order_index: formData.orderIndex ?? 0,
      grade: formData.grade,
      is_active: formData.is_active !== undefined ? formData.is_active : true,
      teacher_id: user.id,
    };

    let error;
    if (questionId) {
      const res = await supabase.from("quiz_questions").update(payload).eq("id", questionId);
      error = res.error;
    } else {
      const res = await supabase.from("quiz_questions").insert(payload);
      error = res.error;
    }

    if (error) {
      return { success: false, error: error.message || "Không thể lưu câu hỏi." };
    }

    revalidatePath("/quiz-management");
    revalidatePath("/login");
    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu.";
    return { success: false, error: errMsg };
  }
}

// Ẩn/hiện nhanh câu hỏi
export async function toggleQuizQuestionActive(
  questionId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Đăng nhập đã hết hạn." };

    const { error } = await supabase
      .from("quiz_questions")
      .update({ is_active: isActive })
      .eq("id", questionId);

    if (error) {
      return { success: false, error: error.message || "Không thể thay đổi trạng thái câu hỏi." };
    }

    revalidatePath("/quiz-management");
    revalidatePath("/login");
    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra.";
    return { success: false, error: errMsg };
  }
}

// Xoá câu hỏi trắc nghiệm (yêu cầu giáo viên)
export async function deleteQuizQuestion(questionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Đăng nhập đã hết hạn." };

    const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
    if (error) {
      return { success: false, error: error.message || "Không thể xoá câu hỏi." };
    }

    revalidatePath("/quiz-management");
    revalidatePath("/login");
    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra khi xoá.";
    return { success: false, error: errMsg };
  }
}

// Tải danh sách video học liệu số (nếu trống, trả về mặc định cho khối 4)
export async function getLessonVideos(grade?: number, teacherId?: string): Promise<LessonVideo[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("lesson_videos")
      .select("*");

    if (grade !== undefined) {
      query = query.eq("grade", grade);
    }

    let targetTeacherId = teacherId;
    if (!targetTeacherId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        targetTeacherId = user.id;
      }
    }

    if (targetTeacherId) {
      query = query.eq("teacher_id", targetTeacherId);
    } else {
      query = query.is("teacher_id", null);
    }

    const { data, error } = await query.order("order_index", { ascending: true });

    if (error || !data || data.length === 0) {
      if (grade === undefined || grade === 4) {
        return STATIC_VIDEOS;
      }
      return [];
    }

    interface DbLessonVideo {
      id: string;
      title: string;
      description: string;
      youtube_url: string | null;
      grade: number;
      order_index: number;
      teacher_id?: string;
      material_type?: "link" | "attachment";
      file_url?: string | null;
      original_file_name?: string | null;
      file_mime_type?: string | null;
      file_size_bytes?: number | null;
      thumbnail_url?: string | null;
      created_at?: string;
    }

    return (data as DbLessonVideo[]).map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      youtubeUrl: v.youtube_url || v.file_url || "",
      grade: v.grade,
      order_index: v.order_index,
      teacher_id: v.teacher_id,
      materialType: v.material_type || "link",
      fileUrl: v.file_url,
      originalFileName: v.original_file_name,
      fileMimeType: v.file_mime_type,
      fileSizeBytes: v.file_size_bytes,
      thumbnailUrl: v.thumbnail_url,
      createdAt: v.created_at,
    }));
  } catch {
    return grade === undefined || grade === 4 ? STATIC_VIDEOS : [];
  }
}

// Thêm hoặc cập nhật video bài giảng
export async function updateLessonVideo(
  videoId: string | null,
  formData: {
    title: string;
    description: string;
    youtubeUrl: string;
    grade: number;
    orderIndex?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      youtube_url: formData.youtubeUrl.trim(),
      grade: formData.grade,
      order_index: formData.orderIndex ?? 0,
      teacher_id: user.id,
    };

    let error;
    if (videoId) {
      const res = await supabase.from("lesson_videos").update(payload).eq("id", videoId);
      error = res.error;
    } else {
      const res = await supabase.from("lesson_videos").insert(payload);
      error = res.error;
    }

    if (error) {
      return { success: false, error: error.message || "Không thể lưu video bài giảng." };
    }

    revalidatePath("/quiz-management");
    revalidatePath("/learning-materials");
    revalidatePath("/login");
    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu video.";
    return { success: false, error: errMsg };
  }
}

// Xoá video bài giảng
export async function deleteLessonVideo(videoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Đăng nhập đã hết hạn." };

    const { error } = await supabase.from("lesson_videos").delete().eq("id", videoId);
    if (error) {
      return { success: false, error: error.message || "Không thể xoá video bài giảng." };
    }

    revalidatePath("/quiz-management");
    revalidatePath("/learning-materials");
    revalidatePath("/login");
    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra khi xoá video.";
    return { success: false, error: errMsg };
  }
}

export async function upsertAttachmentMaterial(
  materialId: string | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };

    const title = String(formData.get("title") || "").trim();
    const grade = Number(formData.get("grade"));
    const fileValue = formData.get("file");
    const thumbnailValue = formData.get("thumbnail");

    if (!title) return { success: false, error: "Vui lòng nhập tên tài liệu." };
    if (!Number.isInteger(grade) || grade < 1 || grade > 5) return { success: false, error: "Vui lòng chọn khối lớp." };

    const current = materialId
      ? await supabase
          .from("lesson_videos")
          .select("file_url, thumbnail_url, original_file_name, file_mime_type, file_size_bytes")
          .eq("id", materialId)
          .eq("teacher_id", user.id)
          .single()
      : null;

    if (current?.error) return { success: false, error: "Không thể cập nhật file đính kèm." };

    const hasNewFile = fileValue instanceof File && fileValue.size > EMPTY_FILE_SIZE;
    if (!materialId && !hasNewFile) return { success: false, error: "Vui lòng chọn file đính kèm." };
    if (hasNewFile && !ATTACHMENT_FILE_TYPES.has(fileValue.type)) {
      return { success: false, error: "File đính kèm chỉ hỗ trợ Word, PowerPoint hoặc PDF." };
    }

    const hasNewThumbnail = thumbnailValue instanceof File && thumbnailValue.size > EMPTY_FILE_SIZE;
    if (hasNewThumbnail && !THUMBNAIL_FILE_TYPES.has(thumbnailValue.type)) {
      return { success: false, error: "Hình minh họa chỉ hỗ trợ JPG, PNG hoặc WEBP." };
    }

    let fileUrl = current?.data?.file_url as string | null | undefined;
    let originalFileName = current?.data?.original_file_name as string | null | undefined;
    let fileMimeType = current?.data?.file_mime_type as string | null | undefined;
    let fileSizeBytes = current?.data?.file_size_bytes as number | null | undefined;
    let thumbnailUrl = current?.data?.thumbnail_url as string | null | undefined;

    if (hasNewFile) {
      const previousFileUrl = fileUrl;
      fileUrl = await uploadToVercelBlob(fileValue, "files", user.id);
      originalFileName = fileValue.name;
      fileMimeType = fileValue.type;
      fileSizeBytes = fileValue.size;
      await deleteFromVercelBlob([previousFileUrl]);
    }

    if (hasNewThumbnail) {
      const previousThumbnailUrl = thumbnailUrl;
      thumbnailUrl = await uploadToVercelBlob(thumbnailValue, "thumbnails", user.id);
      await deleteFromVercelBlob([previousThumbnailUrl]);
    } else if (formData.get("removeThumbnail") === "1") {
      await deleteFromVercelBlob([thumbnailUrl]);
      thumbnailUrl = null;
    }

    const payload = {
      teacher_id: user.id,
      title,
      description: originalFileName || "File đính kèm",
      youtube_url: fileUrl || "",
      grade,
      order_index: 0,
      material_type: "attachment",
      file_url: fileUrl,
      original_file_name: originalFileName,
      file_mime_type: fileMimeType,
      file_size_bytes: fileSizeBytes,
      thumbnail_url: thumbnailUrl,
    };

    const { error } = materialId
      ? await supabase.from("lesson_videos").update(payload).eq("id", materialId).eq("teacher_id", user.id)
      : await supabase.from("lesson_videos").insert(payload);

    if (error) return { success: false, error: "Không thể đăng file đính kèm. Vui lòng thử lại." };

    revalidatePath("/learning-materials");
    revalidatePath("/login");
    return { success: true };
  } catch {
    return { success: false, error: "Không thể đăng file đính kèm. Vui lòng thử lại." };
  }
}

export async function deleteAttachmentMaterial(materialId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Đăng nhập đã hết hạn." };

    const current = await supabase
      .from("lesson_videos")
      .select("file_url, thumbnail_url")
      .eq("id", materialId)
      .eq("teacher_id", user.id)
      .single();

    if (current.error) return { success: false, error: "Không thể xoá file đính kèm." };

    const { error } = await supabase.from("lesson_videos").delete().eq("id", materialId).eq("teacher_id", user.id);
    if (error) return { success: false, error: "Không thể xoá file đính kèm." };

    await deleteFromVercelBlob([current.data.file_url, current.data.thumbnail_url]);
    revalidatePath("/learning-materials");
    revalidatePath("/login");
    return { success: true };
  } catch {
    return { success: false, error: "Không thể xoá file đính kèm." };
  }
}

// Xác thực mã code của giáo viên từ phía học sinh
export async function verifyTeacherCode(code: string): Promise<{
  success: boolean;
  teacherId?: string;
  teacherName?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return { success: false, error: "Vui lòng nhập mã code." };

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("teacher_code", cleanCode)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: "Mã code của giáo viên không chính xác." };
    }

    return {
      success: true,
      teacherId: data.id,
      teacherName: data.full_name,
    };
  } catch (err) {
    return { success: false, error: "Có lỗi xảy ra khi xác thực." };
  }
}

// Xoá kết quả làm bài trắc nghiệm (yêu cầu giáo viên)
export async function deleteQuizSubmission(submissionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Đăng nhập đã hết hạn." };

    const { error } = await supabase
      .from("quiz_submissions")
      .delete()
      .eq("id", submissionId);

    if (error) {
      return { success: false, error: error.message || "Không thể xoá kết quả làm bài." };
    }

    revalidatePath("/quiz-management");
    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra.";
    return { success: false, error: errMsg };
  }
}
