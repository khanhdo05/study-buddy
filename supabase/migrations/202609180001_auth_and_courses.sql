begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 100),
  role text not null check (role in ('student', 'professor')),
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null check (length(trim(name)) between 1 and 150),
  code text not null check (length(trim(code)) between 1 and 30),
  created_at timestamptz not null default now()
);
create index courses_owner_idx on public.courses(owner_id);

create table public.enrollments (
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, student_id)
);
create index enrollments_student_idx on public.enrollments(student_id);

-- Invitation secrets are hashed and never readable through the Data API.
create table public.course_invitations (
  course_id uuid primary key references public.courses(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null
);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- The chosen role permits creating one's own courses, never access to others.
-- Copy it once at account creation; later edits to user_metadata cannot change it.
create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'New learner'), 100),
    case when new.raw_user_meta_data->>'role' = 'professor' then 'professor' else 'student' end
  );
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Backfill accounts created before this migration.
insert into public.profiles (id, full_name, role)
select id, left(coalesce(nullif(trim(raw_user_meta_data->>'full_name'), ''), 'New learner'), 100),
  case when raw_user_meta_data->>'role' = 'professor' then 'professor' else 'student' end
from auth.users on conflict (id) do nothing;

-- Definer helpers avoid recursive RLS between courses and enrollments.
create function private.owns_course(target_course uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.courses where id = target_course and owner_id = (select auth.uid()));
$$;
create function private.can_read_course(target_course uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.courses where id = target_course and owner_id = (select auth.uid()))
    or exists (select 1 from public.enrollments where course_id = target_course and student_id = (select auth.uid()));
$$;
revoke all on function private.owns_course(uuid), private.can_read_course(uuid) from public, anon;
grant execute on function private.owns_course(uuid), private.can_read_course(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.course_invitations enable row level security;
revoke all on public.profiles, public.courses, public.enrollments, public.course_invitations from anon, authenticated;
grant select on public.profiles, public.courses, public.enrollments to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant insert (owner_id, name, code), update (name, code), delete on public.courses to authenticated;

create policy own_profile_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_profile_name on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy course_read on public.courses for select to authenticated using (owner_id = (select auth.uid()) or private.can_read_course(id));
create policy professor_create on public.courses for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'professor')
);
create policy owner_update on public.courses for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy owner_delete on public.courses for delete to authenticated using (owner_id = (select auth.uid()));
create policy enrollment_read on public.enrollments for select to authenticated using (student_id = (select auth.uid()) or private.owns_course(course_id));

create function public.create_course_invite(target_course uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare token text;
begin
  if auth.uid() is null or not private.owns_course(target_course) then
    raise exception 'Only the course owner can create invitations.' using errcode = '42501';
  end if;
  token := replace(gen_random_uuid()::text, '-', '');
  insert into public.course_invitations(course_id, token_hash, expires_at)
  values (target_course, sha256(convert_to(token, 'UTF8')), now() + interval '7 days')
  on conflict (course_id) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at;
  return token;
end;
$$;
create function public.join_course(invitation_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role = 'student') then
    raise exception 'Sign in as a student to join a course.' using errcode = '42501';
  end if;
  select course_id into target from public.course_invitations
  where token_hash = sha256(convert_to(trim(invitation_code), 'UTF8')) and expires_at > now();
  if target is null then raise exception 'This invitation is invalid or has expired.'; end if;
  insert into public.enrollments(course_id, student_id) values (target, auth.uid()) on conflict do nothing;
  return target;
end;
$$;
revoke all on function public.create_course_invite(uuid), public.join_course(text) from public, anon;
grant execute on function public.create_course_invite(uuid), public.join_course(text) to authenticated;

-- Private buckets: object names must start with the course UUID followed by '/'.
-- The upload UI and material-processing pipeline will be implemented separately.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-materials', 'course-materials', false, 26214400, array['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
  ('professor-materials', 'professor-materials', false, 26214400, array['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']);

create policy course_files_read on storage.objects for select to authenticated using (
  bucket_id = 'course-materials' and exists (
    select 1 from public.courses c where c.id::text = (storage.foldername(storage.objects.name))[1]
  )
);
create policy professor_files_read on storage.objects for select to authenticated using (
  bucket_id = 'professor-materials' and exists (
    select 1 from public.courses c where c.id::text = (storage.foldername(storage.objects.name))[1] and c.owner_id = (select auth.uid())
  )
);
create policy owner_files_insert on storage.objects for insert to authenticated with check (
  bucket_id in ('course-materials', 'professor-materials') and exists (
    select 1 from public.courses c where c.id::text = (storage.foldername(storage.objects.name))[1] and c.owner_id = (select auth.uid())
  )
);
create policy owner_files_update on storage.objects for update to authenticated using (
  bucket_id in ('course-materials', 'professor-materials') and exists (
    select 1 from public.courses c where c.id::text = (storage.foldername(storage.objects.name))[1] and c.owner_id = (select auth.uid())
  )
) with check (
  bucket_id in ('course-materials', 'professor-materials') and exists (
    select 1 from public.courses c where c.id::text = (storage.foldername(storage.objects.name))[1] and c.owner_id = (select auth.uid())
  )
);
create policy owner_files_delete on storage.objects for delete to authenticated using (
  bucket_id in ('course-materials', 'professor-materials') and exists (
    select 1 from public.courses c where c.id::text = (storage.foldername(storage.objects.name))[1] and c.owner_id = (select auth.uid())
  )
);
commit;
