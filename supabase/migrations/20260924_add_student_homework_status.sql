-- Add the current homework-submission status shown in the student list.
alter table public.students
  add column if not exists homework_status text;

alter table public.students
  drop constraint if exists students_homework_status_check;

alter table public.students
  add constraint students_homework_status_check
  check (homework_status in ('SUBMITTED', 'NOT_SUBMITTED'));

notify pgrst, 'reload schema';
