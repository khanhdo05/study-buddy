begin;
create table public.course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  source_type text not null check (source_type in ('file', 'website')),
  source_url text,
  bucket text,
  storage_path text,
  mime_type text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (source_type = 'website' and source_url is not null and source_url ~ '^https://[^[:space:]]+$' and length(source_url) <= 2000 and bucket is null and storage_path is null and mime_type is null)
    or
    (source_type = 'file' and bucket is not null and storage_path is not null and mime_type is not null and source_url is null and bucket in ('course-materials', 'professor-materials') and storage_path like course_id::text || '/%' and storage_path !~ '(^|/)\.\.(/|$)' and length(storage_path) <= 512 and mime_type in ('application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'))
  ),
  check (not published or bucket is distinct from 'professor-materials'),
  unique (bucket, storage_path)
);
create index course_materials_course_idx on public.course_materials(course_id);
create table public.course_policies (
  course_id uuid primary key references public.courses(id) on delete cascade,
  hints_first boolean not null default true,
  require_attempt boolean not null default true,
  allow_direct_answers boolean not null default false,
  restrict_to_topics boolean not null default true,
  topics text[] not null default '{}',
  objectives text[] not null default '{}',
  instructions text not null default '' check (length(instructions) <= 5000),
  check (cardinality(topics) <= 100 and cardinality(objectives) <= 100)
);
alter table public.course_materials enable row level security;
alter table public.course_policies enable row level security;
revoke all on public.course_materials, public.course_policies from anon, authenticated;
grant select, insert, update, delete on public.course_materials to authenticated;
grant select, insert, update on public.course_policies to authenticated;
create policy material_read on public.course_materials for select to authenticated using (
  private.owns_course(course_id) or (published and private.can_read_course(course_id))
);
create policy material_create on public.course_materials for insert to authenticated with check (private.owns_course(course_id));
create policy material_update on public.course_materials for update to authenticated using (private.owns_course(course_id)) with check (private.owns_course(course_id));
create policy material_delete on public.course_materials for delete to authenticated using (private.owns_course(course_id));
create policy policy_read on public.course_policies for select to authenticated using (private.can_read_course(course_id));
create policy policy_create on public.course_policies for insert to authenticated with check (private.owns_course(course_id));
create policy policy_update on public.course_policies for update to authenticated using (private.owns_course(course_id)) with check (private.owns_course(course_id));

-- Draft course files are not visible to students just because their path is known.
drop policy course_files_read on storage.objects;
create policy course_files_read on storage.objects for select to authenticated using (
  bucket_id = 'course-materials' and (
    exists (select 1 from public.courses c where c.id::text = (storage.foldername(storage.objects.name))[1] and c.owner_id = (select auth.uid()))
    or exists (select 1 from public.course_materials m where m.bucket = storage.objects.bucket_id and m.storage_path = storage.objects.name and m.published and private.can_read_course(m.course_id))
  )
);
commit;
