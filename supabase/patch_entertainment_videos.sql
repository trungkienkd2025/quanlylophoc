-- Run this once in Supabase SQL Editor for an existing project.
-- Do not run complete_setup.sql on a project that already contains data.

create table if not exists public.entertainment_videos (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text not null default '',
  youtube_url text not null check (char_length(btrim(youtube_url)) > 0),
  grade integer not null default 4 check (grade between 1 and 5),
  order_index integer not null default 1 check (order_index > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entertainment_videos_teacher_order_idx
  on public.entertainment_videos (teacher_id, order_index);

alter table public.entertainment_videos enable row level security;

drop policy if exists "Teachers manage their entertainment videos" on public.entertainment_videos;
create policy "Teachers manage their entertainment videos"
  on public.entertainment_videos for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
