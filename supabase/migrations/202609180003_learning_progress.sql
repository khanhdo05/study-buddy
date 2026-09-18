begin;
create table public.student_concept_state (
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  concept text not null check (length(trim(concept)) between 1 and 200),
  times_seen integer not null default 0 check (times_seen >= 0),
  times_correct integer not null default 0 check (times_correct >= 0 and times_correct <= times_seen),
  last_result boolean,
  last_reviewed timestamptz,
  primary key (student_id, course_id, concept)
);
create index student_concept_course_idx on public.student_concept_state(course_id, student_id);
alter table public.student_concept_state enable row level security;
revoke all on public.student_concept_state from anon, authenticated;
grant select on public.student_concept_state to authenticated;
create policy concept_read_own on public.student_concept_state for select to authenticated using (student_id = (select auth.uid()));
-- Writes are performed by the trusted API after checking the user's bearer token.
grant insert, update on public.student_concept_state to authenticated;
create policy concept_insert_own on public.student_concept_state for insert to authenticated with check (student_id = (select auth.uid()) and private.can_read_course(course_id));
create policy concept_update_own on public.student_concept_state for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()) and private.can_read_course(course_id));
commit;
