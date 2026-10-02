-- One user's job-search records live in this shared table. RLS ensures that
-- a signed-in user can only access rows whose user_id matches their auth.uid().
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company text not null check (char_length(trim(company)) between 1 and 200),
  role text not null check (char_length(trim(role)) between 1 and 200),
  location text not null default '',
  date_applied date not null default current_date,
  status text not null default 'Applied'
    check (status in ('Interested', 'Applied', 'Interviewing', 'Offer', 'Rejected')),
  url text not null default '',
  notes text not null default '',
  next_step text not null default '',
  created_at timestamptz not null default now()
);

create index applications_user_date_idx
  on public.applications (user_id, date_applied desc);

alter table public.applications enable row level security;

-- The browser uses a publishable key, so it gets only the authenticated
-- operations listed here. No anonymous access or service-role key is needed.
revoke all on table public.applications from anon, authenticated;
grant select, insert, update, delete on table public.applications to authenticated;

create policy "Users can read their own applications"
  on public.applications for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own applications"
  on public.applications for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own applications"
  on public.applications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own applications"
  on public.applications for delete to authenticated
  using ((select auth.uid()) = user_id);
