-- Run only against a disposable local Supabase database with migrations applied.
-- Everything is rolled back, including fixture users.
\set ON_ERROR_STOP on
begin;
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rls-a@example.invalid'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'rls-b@example.invalid');
insert into public.applications (id, user_id, company, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Account A', 'Engineer'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Account B', 'Engineer');
insert into public.skill_interview_questions (user_id, skill_key, skill_name, questions) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rls-test', 'RLS test', '["First question?", "Second question?", "Third question?"]'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'rls-test', 'RLS test', '["First question?", "Second question?", "Third question?"]');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
do $$
declare changed integer;
begin
  if (select count(*) from public.applications) <> 1 then raise exception 'Application SELECT leaked another account'; end if;
  if (select count(*) from public.skill_interview_questions) <> 1 then raise exception 'Question SELECT leaked another account'; end if;
  update public.applications set notes = 'unauthorized' where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Application UPDATE crossed ownership'; end if;
  delete from public.applications where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Application DELETE crossed ownership'; end if;
  begin
    insert into public.applications (user_id, company, role) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Forbidden', 'Engineer');
    raise exception 'Application INSERT crossed ownership';
  exception when insufficient_privilege then null; end;
  begin
    update public.applications set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    raise exception 'Application ownership could be reassigned';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.skill_interview_questions (user_id, skill_key, skill_name, questions)
      values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'forbidden', 'Forbidden', '["First?", "Second?", "Third?"]');
    raise exception 'Question INSERT crossed ownership';
  exception when insufficient_privilege then null; end;
  insert into public.applications (company, role) values ('Owned insertion', 'Engineer');
  if (select count(*) from public.applications) <> 2 then raise exception 'Owned application INSERT failed'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  begin
    perform * from public.applications;
    raise exception 'Anonymous application access permitted';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.skill_interview_questions;
    raise exception 'Anonymous question access permitted';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
