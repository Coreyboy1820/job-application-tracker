alter table public.applications
  add column if not exists job_description text not null default '',
  add column if not exists skills jsonb not null default '[]'::jsonb
    check (jsonb_typeof(skills) = 'array'),
  add column if not exists skills_analyzed_at timestamptz,
  add column if not exists skills_source_url text not null default '';

