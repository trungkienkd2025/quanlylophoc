-- Refresh PostgREST after the entertainment RPC has been installed.
--
-- Existing projects can have the function and grants in place while the API
-- still answers with PGRST202 because it cached the schema before the function
-- was created. This migration is intentionally safe to run more than once.

do $$
begin
  if to_regprocedure('public.get_entertainment_videos_for_teacher_code(text)') is null then
    raise exception 'Missing get_entertainment_videos_for_teacher_code(text). Run supabase/patch_entertainment_videos.sql first.';
  end if;
end;
$$;

revoke all on function public.get_entertainment_videos_for_teacher_code(text) from public;
grant execute on function public.get_entertainment_videos_for_teacher_code(text) to anon, authenticated;

notify pgrst, 'reload schema';
