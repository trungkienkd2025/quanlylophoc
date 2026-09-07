-- Restore student-portal access to entertainment videos on existing projects.
-- The table remains private behind RLS; students can only request the videos
-- belonging to the teacher code they entered.

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

revoke all on function public.get_entertainment_videos_for_teacher_code(text) from public;
grant execute on function public.get_entertainment_videos_for_teacher_code(text) to anon, authenticated;

notify pgrst, 'reload schema';
