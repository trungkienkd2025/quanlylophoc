-- =============================================================================
-- QLLH — complete_setup.sql (FILE SQL DUY NHẤT)
-- =============================================================================
-- Dùng cho: project Supabase MỚI / hoặc cố ý RESET toàn bộ dữ liệu ứng dụng.
-- Cách dùng: Supabase Dashboard → SQL Editor → New query → dán toàn bộ → Run.
--
-- CẢNH BÁO: Phần DROP sẽ XÓA vĩnh viễn lớp, học sinh, điểm danh, đánh giá, điểm…
-- KHÔNG chạy trên project đang có dữ liệu học sinh thật trừ khi bạn cố ý reset.
-- Không xóa tài khoản Auth (auth.users); profiles sẽ được tạo lại / backfill.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) RESET (destructive)
-- ---------------------------------------------------------------------------
begin;

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.class_weeks cascade;
drop table if exists public.weekly_attendance cascade;
drop table if exists public.weekly_evaluations cascade;
drop table if exists public.semester_scores cascade;
drop table if exists public.annual_scores cascade;
drop table if exists public.student_points cascade;
drop table if exists public.participation_events cascade;
drop table if exists public.attendance cascade;
drop table if exists public.students cascade;
drop table if exists public.classes cascade;
drop table if exists public.school_years cascade;
drop table if exists public.profiles cascade;

drop function if exists public.save_week_board(uuid, smallint, jsonb, jsonb);
drop function if exists public.undo_student_points_event(uuid, uuid);
drop function if exists public.undo_participation_event(uuid, uuid);
drop function if exists public.import_students(uuid, jsonb);
drop function if exists public.save_attendance(uuid, date, jsonb);
drop function if exists public.record_student_points(uuid, uuid, integer, text, uuid);
drop function if exists public.record_participation(uuid, uuid, uuid, integer);
drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();

drop type if exists public.participation_event_type;
drop type if exists public.student_gender;
drop type if exists public.attendance_status;

commit;

-- ---------------------------------------------------------------------------
-- 2) SCHEMA
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

create type public.attendance_status as enum ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');
create type public.student_gender as enum ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED');
create type public.participation_event_type as enum ('PARTICIPATION');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  teacher_code text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete restrict,
  name text not null check (
    name ~ '^[0-9]{4}-[0-9]{4}$'
    and substring(name from 6 for 4)::int = substring(name from 1 for 4)::int + 1
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index school_years_teacher_name_active_idx
  on public.school_years (teacher_id, name)
  where deleted_at is null;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  school_year_id uuid references public.school_years (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  school_year text not null check (
    school_year ~ '^[0-9]{4}-[0-9]{4}$'
    and substring(school_year from 6 for 4)::int = substring(school_year from 1 for 4)::int + 1
  ),
  grade smallint not null check (grade between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index classes_active_teacher_name_year_key
  on public.classes (teacher_id, lower(name), school_year) where deleted_at is null;
create index classes_active_teacher_idx
  on public.classes (teacher_id, created_at desc) where deleted_at is null;
create index classes_school_year_id_idx
  on public.classes (school_year_id) where deleted_at is null;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  student_code text not null check (char_length(btrim(student_code)) between 1 and 50),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  date_of_birth date,
  gender public.student_gender not null default 'UNSPECIFIED',
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, class_id)
);

create unique index students_active_class_code_key
  on public.students (class_id, lower(student_code)) where deleted_at is null;
create index students_active_class_name_idx
  on public.students (class_id, full_name, id) where deleted_at is null;

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null,
  date date not null,
  status public.attendance_status not null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, date),
  foreign key (student_id, class_id) references public.students (id, class_id) on delete restrict
);
create index attendance_class_date_idx on public.attendance (class_id, date desc);
create index attendance_student_date_idx on public.attendance (student_id, date desc);

create table public.weekly_attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete restrict,
  student_id uuid not null,
  week_number smallint not null check (week_number between 1 and 35),
  status public.attendance_status not null default 'PRESENT',
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, week_number),
  foreign key (student_id, class_id) references public.students (id, class_id) on delete restrict
);
create index weekly_attendance_class_week_idx on public.weekly_attendance (class_id, week_number);

create table public.weekly_evaluations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null,
  week_number smallint not null check (week_number between 1 and 35),
  level text not null default '' check (char_length(btrim(level)) <= 60),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, week_number),
  foreign key (student_id, class_id) references public.students (id, class_id) on delete restrict
);
create index weekly_evaluations_class_week_idx on public.weekly_evaluations (class_id, week_number);

create table public.class_weeks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete restrict,
  week_number smallint not null check (week_number between 1 and 35),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, week_number),
  check (start_date is null or end_date is null or start_date <= end_date)
);
create index class_weeks_class_idx on public.class_weeks (class_id);

create table public.semester_scores (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null,
  theory_score numeric(4,2) check (theory_score is null or theory_score between 0 and 10),
  practice_score numeric(4,2) check (practice_score is null or practice_score between 0 and 10),
  total_score numeric(4,2) generated always as (
    case when theory_score is null or practice_score is null then 0
         else least(10, ceil(theory_score + practice_score)) end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id),
  foreign key (student_id, class_id) references public.students (id, class_id) on delete restrict
);
create index semester_scores_class_idx on public.semester_scores (class_id);

create table public.annual_scores (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null,
  theory_score numeric(4,2) check (theory_score is null or theory_score between 0 and 10),
  practice_score numeric(4,2) check (practice_score is null or practice_score between 0 and 10),
  total_score numeric(4,2) generated always as (
    case when theory_score is null or practice_score is null then 0
         else least(10, ceil(theory_score + practice_score)) end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id),
  foreign key (student_id, class_id) references public.students (id, class_id) on delete restrict
);
create index annual_scores_class_idx on public.annual_scores (class_id);

create table public.participation_events (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null,
  event_type public.participation_event_type not null default 'PARTICIPATION',
  points integer not null check (points in (-1, 1)),
  note text not null default '' check (char_length(note) <= 500),
  client_request_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  foreign key (student_id, class_id) references public.students (id, class_id) on delete restrict,
  unique (created_by, client_request_id)
);
create index participation_events_class_created_idx on public.participation_events (class_id, created_at desc);
create index participation_events_student_created_idx on public.participation_events (student_id, created_at desc);

create table public.student_points (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null,
  points integer not null check (points <> 0 and points between -100 and 100),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  client_request_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  foreign key (student_id, class_id) references public.students (id, class_id) on delete restrict,
  unique (created_by, client_request_id)
);
create index student_points_class_created_idx on public.student_points (class_id, created_at desc);
create index student_points_student_created_idx on public.student_points (student_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3) TRIGGERS
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger school_years_set_updated_at before update on public.school_years
  for each row execute function public.set_updated_at();
create trigger classes_set_updated_at before update on public.classes
  for each row execute function public.set_updated_at();
create trigger students_set_updated_at before update on public.students
  for each row execute function public.set_updated_at();
create trigger attendance_set_updated_at before update on public.attendance
  for each row execute function public.set_updated_at();
create trigger weekly_attendance_set_updated_at before update on public.weekly_attendance
  for each row execute function public.set_updated_at();
create trigger weekly_evaluations_set_updated_at before update on public.weekly_evaluations
  for each row execute function public.set_updated_at();
create trigger class_weeks_set_updated_at before update on public.class_weeks
  for each row execute function public.set_updated_at();
create trigger semester_scores_set_updated_at before update on public.semester_scores
  for each row execute function public.set_updated_at();
create trigger annual_scores_set_updated_at before update on public.annual_scores
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, teacher_code)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), 'Giáo viên'),
    upper(substring(new.id::text from 1 for 6))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.school_years enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.weekly_attendance enable row level security;
alter table public.weekly_evaluations enable row level security;
alter table public.class_weeks enable row level security;
alter table public.semester_scores enable row level security;
alter table public.annual_scores enable row level security;
alter table public.participation_events enable row level security;
alter table public.student_points enable row level security;

create policy "Allow public read profiles" on public.profiles
  for select using (true);
create policy "Teachers can update their profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Teachers can insert their profile" on public.profiles
  for insert with check (id = auth.uid());

create policy "Teachers manage own school years" on public.school_years for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "Teachers view their classes" on public.classes
  for select using (teacher_id = auth.uid());
create policy "Teachers create their classes" on public.classes
  for insert with check (teacher_id = auth.uid());
create policy "Teachers update their classes" on public.classes
  for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "Teachers view students in their classes" on public.students for select
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));
create policy "Teachers create students in their classes" on public.students for insert
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));
create policy "Teachers update students in their classes" on public.students for update
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));

create policy "Teachers manage attendance in their classes" on public.attendance for all
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));

create policy "Teachers manage weekly attendance in their classes" on public.weekly_attendance for all
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));

create policy "Teachers manage weekly evaluations in their classes" on public.weekly_evaluations for all
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));

create policy "Teachers manage class weeks in their classes" on public.class_weeks for all
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));

create policy "Teachers manage semester scores in their classes" on public.semester_scores for all
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));

create policy "Teachers manage annual scores in their classes" on public.annual_scores for all
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));

create policy "Teachers manage participation in their classes" on public.participation_events for all
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null))
  with check (created_by = auth.uid() and exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));

create policy "Teachers manage points in their classes" on public.student_points for all
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null))
  with check (created_by = auth.uid() and exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid() and c.deleted_at is null));

-- ---------------------------------------------------------------------------
-- 5) RPC
-- ---------------------------------------------------------------------------
create or replace function public.record_participation(p_class_id uuid, p_student_id uuid, p_request_id uuid, p_points integer default 1)
returns public.participation_events
language plpgsql security invoker set search_path = public as $$
declare v_event public.participation_events;
begin
  if auth.uid() is null or p_points not in (-1, 1) then
    raise exception 'Invalid participation request' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.students s
    join public.classes c on c.id = s.class_id
    where s.id = p_student_id and s.class_id = p_class_id
      and s.deleted_at is null and c.teacher_id = auth.uid() and c.deleted_at is null
  ) then
    raise exception 'Student is unavailable' using errcode = '42501';
  end if;
  insert into public.participation_events (class_id, student_id, points, client_request_id, created_by)
  values (p_class_id, p_student_id, p_points, p_request_id, auth.uid())
  on conflict (created_by, client_request_id) do update set client_request_id = excluded.client_request_id
  returning * into v_event;
  return v_event;
end;
$$;

create or replace function public.record_student_points(p_class_id uuid, p_student_id uuid, p_points integer, p_reason text, p_request_id uuid)
returns public.student_points
language plpgsql security invoker set search_path = public as $$
declare v_point public.student_points;
begin
  if auth.uid() is null or p_points = 0 or p_points not between -100 and 100
     or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'Invalid points request' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.students s
    join public.classes c on c.id = s.class_id
    where s.id = p_student_id and s.class_id = p_class_id
      and s.deleted_at is null and c.teacher_id = auth.uid() and c.deleted_at is null
  ) then
    raise exception 'Student is unavailable' using errcode = '42501';
  end if;
  insert into public.student_points (class_id, student_id, points, reason, client_request_id, created_by)
  values (p_class_id, p_student_id, p_points, btrim(p_reason), p_request_id, auth.uid())
  on conflict (created_by, client_request_id) do update set client_request_id = excluded.client_request_id
  returning * into v_point;
  return v_point;
end;
$$;

create or replace function public.save_attendance(p_class_id uuid, p_date date, p_entries jsonb)
returns integer
language plpgsql security invoker set search_path = public as $$
declare v_count integer;
begin
  if auth.uid() is null or p_date is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Invalid attendance request' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.classes c
    where c.id = p_class_id and c.teacher_id = auth.uid() and c.deleted_at is null
  ) then
    raise exception 'Class is unavailable' using errcode = '42501';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_entries) as e(student_id uuid, status public.attendance_status, note text)
    left join public.students s on s.id = e.student_id and s.class_id = p_class_id and s.deleted_at is null
    where s.id is null or e.student_id is null or e.status is null or char_length(coalesce(e.note, '')) > 500
  ) then
    raise exception 'Invalid attendance entries' using errcode = '22023';
  end if;
  if (
    select count(*) from jsonb_to_recordset(p_entries) as e(student_id uuid, status public.attendance_status, note text)
  ) <> (
    select count(distinct e.student_id) from jsonb_to_recordset(p_entries) as e(student_id uuid, status public.attendance_status, note text)
  ) then
    raise exception 'Duplicate student in attendance request' using errcode = '22023';
  end if;
  insert into public.attendance (class_id, student_id, date, status, note)
  select p_class_id, e.student_id, p_date, e.status, coalesce(e.note, '')
  from jsonb_to_recordset(p_entries) as e(student_id uuid, status public.attendance_status, note text)
  on conflict (student_id, date) do update
    set status = excluded.status, note = excluded.note, updated_at = now()
  where public.attendance.class_id = p_class_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.save_week_board(
  p_class_id uuid,
  p_week_number smallint,
  p_attendance jsonb,
  p_evaluations jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_teacher uuid := auth.uid();
  v_owned boolean;
begin
  if v_teacher is null then raise exception 'not authenticated'; end if;
  if p_week_number is null or p_week_number < 1 or p_week_number > 35 then
    raise exception 'invalid week';
  end if;
  select exists (
    select 1 from public.classes c
    where c.id = p_class_id and c.teacher_id = v_teacher and c.deleted_at is null
  ) into v_owned;
  if not v_owned then raise exception 'forbidden'; end if;

  if p_attendance is not null and jsonb_typeof(p_attendance) = 'array' then
    insert into public.weekly_attendance (class_id, student_id, week_number, status, note)
    select
      p_class_id,
      (row_item->>'student_id')::uuid,
      p_week_number,
      (row_item->>'status')::public.attendance_status,
      coalesce(row_item->>'note', '')
    from jsonb_array_elements(p_attendance) as row_item
    where exists (
      select 1 from public.students s
      where s.id = (row_item->>'student_id')::uuid
        and s.class_id = p_class_id and s.deleted_at is null
    )
    on conflict (student_id, week_number) do update
      set status = excluded.status, note = excluded.note, updated_at = now();
  end if;

  if p_evaluations is not null and jsonb_typeof(p_evaluations) = 'array' then
    insert into public.weekly_evaluations (class_id, student_id, week_number, level, comment)
    select
      p_class_id,
      (row_item->>'student_id')::uuid,
      p_week_number,
      coalesce(btrim(row_item->>'level'), ''),
      coalesce(btrim(row_item->>'comment'), '')
    from jsonb_array_elements(p_evaluations) as row_item
    where (
      coalesce(btrim(row_item->>'level'), '') <> ''
      or coalesce(btrim(row_item->>'comment'), '') <> ''
    )
    and exists (
      select 1 from public.students s
      where s.id = (row_item->>'student_id')::uuid
        and s.class_id = p_class_id and s.deleted_at is null
    )
    on conflict (student_id, week_number) do update
      set level = excluded.level, comment = excluded.comment, updated_at = now();
  end if;
end;
$$;

create or replace function public.import_students(p_class_id uuid, p_students jsonb)
returns integer
language plpgsql security invoker set search_path = public as $$
declare v_count integer;
begin
  if auth.uid() is null or jsonb_typeof(p_students) <> 'array' then
    raise exception 'Invalid import request' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.classes c
    where c.id = p_class_id and c.teacher_id = auth.uid() and c.deleted_at is null
  ) then
    raise exception 'Class is unavailable' using errcode = '42501';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_students) as s(
      student_code text, full_name text, date_of_birth date, gender public.student_gender, notes text
    )
    where s.student_code is null or char_length(btrim(s.student_code)) not between 1 and 50
      or s.full_name is null or char_length(btrim(s.full_name)) not between 1 and 120
      or char_length(coalesce(s.notes, '')) > 2000
  ) then
    raise exception 'Invalid student rows' using errcode = '22023';
  end if;
  if (
    select count(*) from jsonb_to_recordset(p_students) as s(
      student_code text, full_name text, date_of_birth date, gender public.student_gender, notes text
    )
  ) <> (
    select count(distinct lower(btrim(s.student_code))) from jsonb_to_recordset(p_students) as s(
      student_code text, full_name text, date_of_birth date, gender public.student_gender, notes text
    )
  ) then
    raise exception 'Duplicate student code in import request' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_students) as s(
      student_code text, full_name text, date_of_birth date, gender public.student_gender, notes text
    )
    join public.students st
      on st.class_id = p_class_id
     and lower(st.student_code) = lower(btrim(s.student_code))
     and st.deleted_at is null
  ) then
    raise exception 'Duplicate student code in class' using errcode = '23505';
  end if;

  insert into public.students (class_id, student_code, full_name, date_of_birth, gender, notes)
  select
    p_class_id,
    btrim(s.student_code),
    btrim(s.full_name),
    s.date_of_birth,
    coalesce(s.gender, 'UNSPECIFIED'::public.student_gender),
    coalesce(s.notes, '')
  from jsonb_to_recordset(p_students) as s(
    student_code text, full_name text, date_of_birth date, gender public.student_gender, notes text
  );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.undo_participation_event(p_class_id uuid, p_event_id uuid)
returns public.participation_events
language plpgsql security invoker set search_path = public as $$
declare
  v_original public.participation_events;
  v_undo public.participation_events;
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  select pe.* into v_original
  from public.participation_events pe
  join public.classes c on c.id = pe.class_id
  where pe.id = p_event_id and pe.class_id = p_class_id and pe.created_by = auth.uid()
    and pe.points = 1 and pe.event_type = 'PARTICIPATION'
    and pe.created_at >= now() - interval '30 seconds'
    and c.teacher_id = auth.uid() and c.deleted_at is null
    and not exists (
      select 1 from public.participation_events newer
      where newer.class_id = pe.class_id and newer.student_id = pe.student_id
        and newer.created_by = pe.created_by and newer.event_type = 'PARTICIPATION'
        and newer.created_at > pe.created_at
    );
  if not found then raise exception 'Event cannot be undone' using errcode = '42501'; end if;
  insert into public.participation_events (class_id, student_id, event_type, points, note, created_by)
  values (v_original.class_id, v_original.student_id, 'PARTICIPATION', -1, 'Hoàn tác lượt phát biểu', auth.uid())
  returning * into v_undo;
  return v_undo;
end;
$$;

create or replace function public.undo_student_points_event(p_class_id uuid, p_event_id uuid)
returns public.student_points
language plpgsql security invoker set search_path = public as $$
declare
  v_original public.student_points;
  v_undo public.student_points;
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  select sp.* into v_original
  from public.student_points sp
  join public.classes c on c.id = sp.class_id
  where sp.id = p_event_id and sp.class_id = p_class_id and sp.created_by = auth.uid()
    and sp.created_at >= now() - interval '30 seconds'
    and c.teacher_id = auth.uid() and c.deleted_at is null
    and not exists (
      select 1 from public.student_points newer
      where newer.class_id = sp.class_id and newer.student_id = sp.student_id
        and newer.created_by = sp.created_by and newer.created_at > sp.created_at
    );
  if not found then raise exception 'Event cannot be undone' using errcode = '42501'; end if;
  insert into public.student_points (class_id, student_id, points, reason, created_by)
  values (v_original.class_id, v_original.student_id, -v_original.points, 'Hoàn tác: ' || v_original.reason, auth.uid())
  returning * into v_undo;
  return v_undo;
end;
$$;

revoke all on function public.record_participation(uuid, uuid, uuid, integer) from public;
revoke all on function public.record_student_points(uuid, uuid, integer, text, uuid) from public;
revoke all on function public.save_attendance(uuid, date, jsonb) from public;
revoke all on function public.save_week_board(uuid, smallint, jsonb, jsonb) from public;
revoke all on function public.import_students(uuid, jsonb) from public;
revoke all on function public.undo_participation_event(uuid, uuid) from public;
revoke all on function public.undo_student_points_event(uuid, uuid) from public;

grant execute on function public.record_participation(uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.record_student_points(uuid, uuid, integer, text, uuid) to authenticated;
grant execute on function public.save_attendance(uuid, date, jsonb) to authenticated;
grant execute on function public.save_week_board(uuid, smallint, jsonb, jsonb) to authenticated;
grant execute on function public.import_students(uuid, jsonb) to authenticated;
grant execute on function public.undo_participation_event(uuid, uuid) to authenticated;
grant execute on function public.undo_student_points_event(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) STUDENT QUIZ & SUBMISSIONS TABLES
-- ---------------------------------------------------------------------------

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  question text not null check (char_length(btrim(question)) > 0),
  options text[] not null check (cardinality(options) = 4),
  correct_answer integer not null check (correct_answer between 0 and 3),
  explanation text not null,
  order_index integer not null default 0,
  grade integer not null default 4 check (grade between 1 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_videos (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text not null,
  youtube_url text not null default '',
  grade integer not null check (grade between 1 and 5),
  order_index integer not null default 0,
  material_type text not null default 'link' check (material_type in ('link', 'attachment')),
  file_url text,
  original_file_name text,
  file_mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  thumbnail_url text,
  constraint lesson_videos_youtube_url_check check (material_type = 'attachment' or char_length(btrim(youtube_url)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  student_name text not null check (char_length(btrim(student_name)) > 0),
  class_name text not null check (char_length(btrim(class_name)) > 0),
  score integer not null,
  total_questions integer not null,
  completed_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists quiz_questions_teacher_id_idx on public.quiz_questions (teacher_id);
create index if not exists lesson_videos_teacher_id_idx on public.lesson_videos (teacher_id);
create index if not exists quiz_submissions_teacher_id_idx on public.quiz_submissions (teacher_id);

-- Enable RLS
alter table public.quiz_questions enable row level security;
alter table public.lesson_videos enable row level security;
alter table public.quiz_submissions enable row level security;

-- Policies for quiz_questions
create policy "Allow public read quiz questions"
  on public.quiz_questions for select using (true);

create policy "Allow authenticated write quiz questions"
  on public.quiz_questions for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Policies for lesson_videos
create policy "Allow public read lesson videos"
  on public.lesson_videos for select using (true);

create policy "Allow authenticated write lesson videos"
  on public.lesson_videos for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Policies for quiz_submissions
create policy "Allow public insert quiz submissions"
  on public.quiz_submissions for insert
  with check (true);

create policy "Allow authenticated read quiz submissions"
  on public.quiz_submissions for select
  using (auth.uid() = teacher_id);

create policy "Allow authenticated delete quiz submissions"
  on public.quiz_submissions for delete
  using (auth.uid() = teacher_id);

-- ---------------------------------------------------------------------------
-- 7) PROFILE BACKFILL
-- ---------------------------------------------------------------------------
insert into public.profiles (id, full_name, teacher_code)
select
  id,
  coalesce(nullif(btrim(raw_user_meta_data ->> 'full_name'), ''), split_part(email, '@', 1), 'Giáo viên'),
  upper(substring(id::text from 1 for 6))
from auth.users
on conflict (id) do nothing;

-- =============================================================================
-- Hết complete_setup.sql
-- =============================================================================
