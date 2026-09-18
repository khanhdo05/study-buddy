-- Run after the migration against a disposable database. All test data rolls back.
\set ON_ERROR_STOP on
begin;
insert into auth.users (id, raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001', '{"full_name":"Professor One","role":"professor"}'),
 ('10000000-0000-0000-0000-000000000002', '{"full_name":"Professor Two","role":"professor"}'),
 ('20000000-0000-0000-0000-000000000001', '{"full_name":"Student One","role":"student"}'),
 ('20000000-0000-0000-0000-000000000002', '{"full_name":"Student Two","role":"student"}');
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
insert into public.courses (owner_id, name, code) values (auth.uid(), 'Biology', 'BIO101') returning id as course_one \gset
select public.create_course_invite(:'course_one') as invitation \gset
insert into storage.objects (bucket_id, name) values
 ('course-materials', :'course_one' || '/notes.pdf'),
 ('professor-materials', :'course_one' || '/answers.pdf');

do $$ begin
 if (select count(*) from public.profiles) <> 1 then raise exception 'Profile isolation failed'; end if;
 if (select count(*) from storage.objects) <> 2 then raise exception 'Owner file read failed'; end if;
 begin
   update public.profiles set role = 'student' where id = auth.uid();
   raise exception 'Role edit unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
do $$ begin
 if (select count(*) from public.courses) <> 0 then raise exception 'Professor isolation failed'; end if;
 if (select count(*) from storage.objects) <> 0 then raise exception 'File isolation failed'; end if;
end $$;
select set_config('test.course', :'course_one', true);
do $$ begin
 begin
  perform public.create_course_invite(current_setting('test.course')::uuid);
  raise exception 'Non-owner invite unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
do $$ begin
 if (select count(*) from public.courses) <> 0 then raise exception 'Unenrolled student sees courses'; end if;
 begin
  insert into public.courses(owner_id, name, code) values(auth.uid(), 'Bad', 'BAD');
  raise exception 'Student created a course';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.enrollments(course_id, student_id) values(current_setting('test.course')::uuid, auth.uid());
  raise exception 'Student bypassed invitation';
 exception when insufficient_privilege then null; end;
 begin
  perform public.join_course('invalid');
  raise exception 'Invalid invitation accepted';
 exception when raise_exception then
  if sqlerrm <> 'This invitation is invalid or has expired.' then raise; end if;
 end;
end $$;
select public.join_course(:'invitation');
select public.join_course(:'invitation'); -- Idempotent joining.
do $$ begin
 if (select count(*) from public.courses) <> 1 then raise exception 'Joined course missing'; end if;
 if (select count(*) from public.enrollments) <> 1 then raise exception 'Duplicate or missing enrollment'; end if;
 if (select count(*) from storage.objects) <> 1 then raise exception 'Student file visibility failed'; end if;
 if exists(select 1 from storage.objects where bucket_id = 'professor-materials') then raise exception 'Professor-only file exposed'; end if;
 update public.courses set name = 'Tampered' where id = current_setting('test.course')::uuid;
 if found then raise exception 'Student changed course'; end if;
 begin
  insert into storage.objects(bucket_id,name) values('course-materials', current_setting('test.course') || '/bad.pdf');
  raise exception 'Student uploaded instructor file';
 exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';
do $$ begin
 if (select count(*) from public.enrollments) <> 0 then raise exception 'Student sees another enrollment'; end if;
 if (select count(*) from storage.objects) <> 0 then raise exception 'Nonmember sees course files'; end if;
end $$;
reset role;
update auth.users set raw_user_meta_data = '{"role":"professor"}' where id = '20000000-0000-0000-0000-000000000002';
do $$ begin
 if (select role from public.profiles where id = '20000000-0000-0000-0000-000000000002') <> 'student' then raise exception 'Metadata changed protected role'; end if;
end $$;
update public.course_invitations set expires_at = now() - interval '1 day';
set local role authenticated;
select set_config('test.invite', :'invitation', true);
do $$ begin
 begin
  perform public.join_course(current_setting('test.invite'));
  raise exception 'Expired invitation accepted';
 exception when raise_exception then
  if sqlerrm <> 'This invitation is invalid or has expired.' then raise; end if;
 end;
end $$;
set local role anon;
do $$ begin
 begin
  perform * from public.courses;
  raise exception 'Anonymous course access';
 exception when insufficient_privilege then null; end;
 begin
  perform public.join_course('test');
  raise exception 'Anonymous RPC access';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
\echo 'All access-control checks passed.'
