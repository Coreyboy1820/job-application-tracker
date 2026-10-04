-- Older cached analyses are re-extracted from their saved description on next open.
alter table public.applications
  add column if not exists skill_extraction_version smallint not null default 0
    check (skill_extraction_version >= 0);
