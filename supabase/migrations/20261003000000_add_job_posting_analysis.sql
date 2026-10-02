alter table public.applications
  add column job_description text not null default '',
  add column skills jsonb not null default '[]'::jsonb
    check (jsonb_typeof(skills) = 'array'),
  add column skills_analyzed_at timestamptz,
  add column skills_source_url text not null default '';

