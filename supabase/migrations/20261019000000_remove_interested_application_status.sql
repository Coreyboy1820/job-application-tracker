-- Preserve existing applications when retiring the Interested status.
update public.applications
set status = 'Applied'
where status = 'Interested';

alter table public.applications
  drop constraint applications_status_check,
  add constraint applications_status_check
    check (status in ('Rejected', 'Applied', 'Interviewing', 'Offer'));
