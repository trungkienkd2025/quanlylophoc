-- Safe forward-only patch for existing projects. Do not rerun complete_setup.sql.
begin;

create table if not exists public.teacher_schedules (
  teacher_id uuid primary key references public.profiles (id) on delete cascade,
  schedule jsonb not null default '[["","","","",""],["","","","",""],["","","","",""],["","","","",""],["","","","",""],["","","","",""],["","","","",""]]'::jsonb
    check (jsonb_typeof(schedule) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists teacher_schedules_set_updated_at on public.teacher_schedules;
create trigger teacher_schedules_set_updated_at before update on public.teacher_schedules
  for each row execute function public.set_updated_at();

alter table public.teacher_schedules enable row level security;

drop policy if exists "Teachers manage own schedule" on public.teacher_schedules;
create policy "Teachers manage own schedule" on public.teacher_schedules for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

grant select, insert, update, delete on table public.teacher_schedules to authenticated;

commit;

notify pgrst, 'reload schema';
