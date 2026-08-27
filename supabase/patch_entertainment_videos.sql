-- Add YouTube entertainment videos for existing Supabase projects.
-- New/reset projects receive this table from complete_setup.sql.
-- Run this file once in the Supabase SQL Editor for projects created before
-- the entertainment feature was deployed. It is safe to run more than once.

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

-- Do not rely on project-specific default privileges. The server action uses
-- the authenticated role, and RLS below keeps every video private to its owner.
grant select, insert, update, delete on table public.entertainment_videos to authenticated;

drop policy if exists "Teachers manage own entertainment videos" on public.entertainment_videos;
create policy "Teachers manage own entertainment videos"
  on public.entertainment_videos for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Students access these videos from the learning portal only after entering the
-- teacher's class code. Direct table access remains limited to the owning teacher.
create or replace function public.get_entertainment_videos_for_teacher_code(p_teacher_code text)
returns table (
  id uuid,
  title text,
  description text,
  youtube_url text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select video.id, video.title, video.description, video.youtube_url, video.created_at
  from public.entertainment_videos as video
  join public.profiles as profile on profile.id = video.teacher_id
  where profile.teacher_code = upper(btrim(p_teacher_code))
  order by video.created_at desc;
$$;

grant execute on function public.get_entertainment_videos_for_teacher_code(text) to anon, authenticated;
