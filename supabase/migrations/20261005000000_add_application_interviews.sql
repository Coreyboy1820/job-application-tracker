alter table public.applications
  add column interviews jsonb not null default '[]'::jsonb
  check (jsonb_typeof(interviews) = 'array');
