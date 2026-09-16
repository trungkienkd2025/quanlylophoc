-- Fix existing projects: attendance must follow the entered class, not the
-- grade selected for learning content. The target class is still restricted to
-- grades 4 and 5, and the teacher code remains mandatory.
create or replace function public.record_portal_attendance(
  p_student_name text,
  p_class_name text,
  p_grade smallint,
  p_teacher_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_class_id uuid;
  v_week_number smallint;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if p_grade not in (4, 5)
    or char_length(btrim(coalesce(p_student_name, ''))) = 0
    or char_length(btrim(coalesce(p_class_name, ''))) = 0
    or char_length(btrim(coalesce(p_teacher_code, ''))) = 0 then
    return false;
  end if;

  select s.id, c.id into v_student_id, v_class_id
  from public.students s
  join public.classes c on c.id = s.class_id
  join public.profiles p on p.id = c.teacher_id
  where s.deleted_at is null
    and c.deleted_at is null
    and c.grade in (4, 5)
    and lower(btrim(s.full_name)) = lower(btrim(p_student_name))
    and lower(btrim(c.name)) = lower(btrim(p_class_name))
    and p.teacher_code = upper(btrim(p_teacher_code))
  limit 1;

  if v_student_id is null then return false; end if;

  insert into public.attendance (class_id, student_id, date, status, note)
  values (v_class_id, v_student_id, v_today, 'PRESENT', '')
  on conflict (student_id, date) do update
    set status = 'PRESENT', note = '', updated_at = now();

  select cw.week_number into v_week_number
  from public.class_weeks cw
  where cw.class_id = v_class_id
    and cw.start_date <= v_today
    and cw.end_date >= v_today
  order by cw.week_number
  limit 1;

  if v_week_number is not null then
    insert into public.weekly_attendance (class_id, student_id, week_number, status, note)
    values (v_class_id, v_student_id, v_week_number, 'PRESENT', '')
    on conflict (student_id, week_number) do update
      set status = 'PRESENT', note = '', updated_at = now();
  end if;

  return true;
end;
$$;

revoke all on function public.record_portal_attendance(text, text, smallint, text) from public;
grant execute on function public.record_portal_attendance(text, text, smallint, text) to anon, authenticated;
notify pgrst, 'reload schema';
