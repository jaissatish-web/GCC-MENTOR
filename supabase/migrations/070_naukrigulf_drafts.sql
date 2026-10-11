-- One private, editable NaukriGulf draft per user. Career Profile remains authoritative.
-- Rollback: disable the feature, then drop public.naukrigulf_drafts and remove only
-- the naukrigulf_optimization service-control row (draft data would be discarded).
create table public.naukrigulf_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade
    references public.career_profiles(user_id) on delete cascade,
  revision uuid not null default gen_random_uuid(),
  imported jsonb,
  setup jsonb,
  output jsonb,
  selected_headline integer not null default 0 check (selected_headline between 0 and 2),
  completed jsonb not null default '[]'::jsonb check (jsonb_typeof(completed) = 'array'),
  skipped jsonb not null default '[]'::jsonb check (jsonb_typeof(skipped) = 'array'),
  profile_fingerprint text,
  updated_at timestamptz not null default now(),
  constraint naukrigulf_object_fields check (
    (imported is null or jsonb_typeof(imported) = 'object') and
    (setup is null or jsonb_typeof(setup) = 'object') and
    (output is null or jsonb_typeof(output) = 'object'))
);
alter table public.naukrigulf_drafts enable row level security;
revoke all on public.naukrigulf_drafts from anon, authenticated;
grant select on public.naukrigulf_drafts to authenticated;
grant all on public.naukrigulf_drafts to service_role;
create policy naukrigulf_drafts_owner_read on public.naukrigulf_drafts
  for select to authenticated using ((select auth.uid()) = user_id);
-- Writes go through authenticated, ownership-scoped, validated API routes.
insert into public.ai_service_controls
  (action, service_key, enabled, daily_limit_per_user, max_concurrent_per_user)
values ('naukrigulf_optimization', 'naukrigulf_optimization', true, 5, 1)
on conflict (action) do nothing;

NOTIFY pgrst, 'reload schema';
