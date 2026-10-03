alter table public.applications
  add column if not exists interviews jsonb not null default '[]'::jsonb
  check (jsonb_typeof(interviews) = 'array');
