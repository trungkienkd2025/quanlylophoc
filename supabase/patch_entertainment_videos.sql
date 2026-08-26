-- Add YouTube entertainment videos for existing Supabase projects.
-- New/reset projects receive this table from complete_setup.sql.

create table if not exists public.entertainment_videos (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 160),
  description text not null check (char_length(btrim(description)) > 0 and char_length(description) <= 500),
  youtube_url text not null check (char_length(btrim(youtube_url)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists entertainment_videos_teacher_created_idx
  on public.entertainment_videos (teacher_id, created_at desc);

alter table public.entertainment_videos enable row level security;

drop policy if exists "Teachers manage own entertainment videos" on public.entertainment_videos;
create policy "Teachers manage own entertainment videos"
  on public.entertainment_videos for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
