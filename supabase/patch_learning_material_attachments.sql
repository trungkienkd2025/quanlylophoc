-- Add attachment metadata to lesson_videos for /learning-materials file uploads.
-- Run this on existing Supabase projects. New/reset projects can use complete_setup.sql.

alter table public.lesson_videos
  add column if not exists material_type text not null default 'link',
  add column if not exists file_url text,
  add column if not exists original_file_name text,
  add column if not exists file_mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists thumbnail_url text;

alter table public.lesson_videos
  alter column youtube_url set default '';

alter table public.lesson_videos
  drop constraint if exists lesson_videos_youtube_url_check;

alter table public.lesson_videos
  add constraint lesson_videos_youtube_url_check
  check (material_type = 'attachment' or char_length(btrim(youtube_url)) > 0);

alter table public.lesson_videos
  drop constraint if exists lesson_videos_material_type_check;

alter table public.lesson_videos
  add constraint lesson_videos_material_type_check
  check (material_type in ('link', 'attachment'));

alter table public.lesson_videos
  drop constraint if exists lesson_videos_file_size_bytes_check;

alter table public.lesson_videos
  add constraint lesson_videos_file_size_bytes_check
  check (file_size_bytes is null or file_size_bytes > 0);

create index if not exists lesson_videos_material_type_idx on public.lesson_videos (material_type);
