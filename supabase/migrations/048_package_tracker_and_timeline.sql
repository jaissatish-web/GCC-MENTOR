-- Package tracker fields and service timeline.
--
-- Additive only: packages already has owner-only RLS and the API scopes every
-- read/write by id + user_id. No new exposed table or policy is introduced.

alter table public.packages
  add column if not exists job_url text,
  add column if not exists application_deadline date,
  add column if not exists interview_date timestamptz,
  add column if not exists application_notes text,
  add column if not exists service_events jsonb[] not null default array[]::jsonb[];
