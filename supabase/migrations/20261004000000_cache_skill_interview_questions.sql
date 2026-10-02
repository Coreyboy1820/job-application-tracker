alter table public.applications
  add column if not exists interview_questions_version smallint not null default 0
    check (interview_questions_version in (0, 1));

create table public.skill_interview_questions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  skill_key text not null check (char_length(trim(skill_key)) between 1 and 300),
  skill_name text not null check (char_length(trim(skill_name)) between 1 and 100),
  questions jsonb not null check (
    jsonb_typeof(questions) = 'array'
    and jsonb_array_length(questions) = 3
    and jsonb_typeof(questions -> 0) = 'string'
    and jsonb_typeof(questions -> 1) = 'string'
    and jsonb_typeof(questions -> 2) = 'string'
    and char_length(trim(questions ->> 0)) between 1 and 500
    and char_length(trim(questions ->> 1)) between 1 and 500
    and char_length(trim(questions ->> 2)) between 1 and 500
  ),
  created_at timestamptz not null default now(),
  primary key (user_id, skill_key)
);

alter table public.skill_interview_questions enable row level security;

revoke all on table public.skill_interview_questions from anon, authenticated;
grant select, insert on table public.skill_interview_questions to authenticated;

create policy "Users can read their own skill interview questions"
  on public.skill_interview_questions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can cache their own skill interview questions"
  on public.skill_interview_questions for insert to authenticated
  with check ((select auth.uid()) = user_id);
