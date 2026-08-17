-- Migration 039 — one place that decides what the free plan includes (TASK-163).
--
-- Founder decision 2026-08-17, after choosing "control panel first": the free/paid
-- split must be editable from /admin without a deploy, and the free template list
-- must be his to pick.
--
-- WHY A TABLE AND NOT CONSTANTS IN CODE. The rules would otherwise end up spread
-- across a dozen gates, and every price or packaging change would need a developer.
-- That is the difference between a business the founder runs and one he has to ask
-- about. One row per feature, read by one function, edited from one screen.
--
-- THE SHAPE, and why each column exists:
--   free_allowed  the only question most gates ask.
--   free_limit    a count where "allowed" is not enough (one free resume, twenty
--                 scans a day). NULL means no limit.
--   free_value    a jsonb payload for entitlements that are a LIST rather than a
--                 yes/no — specifically which templates the free plan may use,
--                 which the founder wants to choose himself.
--   requires_ai   not a gate. It tells the admin screen which rows cost real money
--                 when switched on, so opening one up is an informed decision
--                 rather than a surprise on the OpenRouter bill.
--
-- SECURITY, and this is the part that matters. This project has been burned once
-- by assuming default privileges are safe (docs/TASKS.md Unplanned #18: this
-- Supabase project grants directly to anon and authenticated, which a
-- REVOKE ... FROM PUBLIC never touched). So this table gets:
--   * RLS enabled;
--   * a SELECT policy only — the free tier is public information, the app shows it
--     on locked tiles, and hiding it would buy nothing;
--   * NO insert/update/delete policy at all, so RLS denies every write from a
--     client key regardless of what grants exist;
--   * explicit REVOKE of INSERT/UPDATE/DELETE from anon and authenticated, so the
--     denial does not rest on the absence of a policy alone.
-- Writes happen only through an admin server action using the service-role client.

create table if not exists public.plan_entitlements (
  feature text primary key,
  label text not null,
  description text,
  free_allowed boolean not null default false,
  free_limit integer,
  free_value jsonb,
  requires_ai boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.plan_entitlements is
  'What the FREE plan includes, one row per feature. Read by lib/entitlements.ts; edited from /admin/plan. Paid access is decided per-resume by lib/packageAccess.ts (whether AI text exists) and by credits — this table governs the free side only.';

alter table public.plan_entitlements enable row level security;

drop policy if exists plan_entitlements_read on public.plan_entitlements;
create policy plan_entitlements_read
  on public.plan_entitlements
  for select
  using (true);

-- Belt and braces, per Unplanned #18: do not rely on "no policy" alone.
revoke insert, update, delete on public.plan_entitlements from anon, authenticated;

-- Seed the nine features the product actually has today. ON CONFLICT DO NOTHING so
-- re-running never overwrites a value the founder has since changed from /admin.
insert into public.plan_entitlements
  (feature, label, description, free_allowed, free_limit, free_value, requires_ai, sort_order)
values
  ('gcc_readiness_scan', 'GCC readiness score',
   'Upload or paste a CV and get a score out of 100. Pure arithmetic, no AI, so it costs nothing to give away.',
   true, 20, null, false, 10),

  ('typed_profile', 'Type a Career Profile by hand',
   'Fill the profile form manually. No AI involved, so it is free.',
   true, null, null, false, 20),

  ('resume_extraction', 'Read a CV into the profile automatically',
   'Turns an uploaded CV into profile fields. This is an AI call on every use — the main free-tier cost if switched on.',
   false, null, null, true, 30),

  ('free_resume', 'Keep a free resume',
   'A resume built from the user own typed profile, no AI wording. How many they may keep at once.',
   true, 1, null, false, 40),

  ('templates', 'Templates the free plan may use',
   'Which template designs a free user can pick. Choose photo-free designs to keep photos as a paid feature without any special rule.',
   true, null, '["ats_classic","gulf_minimal"]'::jsonb, false, 50),

  ('pdf_download', 'Download a PDF',
   'Download the resume as a PDF. Free for a resume with no AI wording in it.',
   true, null, null, false, 60),

  ('job_match', 'ATS / Job Match against a job advert',
   'Scores a CV against one specific job advert. Uses AI to structure the advert and to explain the result.',
   false, null, null, true, 70),

  ('resume_optimization', 'AI resume rewrite',
   'The paid product: rewrites the summary and achievement bullets for one target job.',
   false, null, null, true, 80),

  ('cover_letter', 'AI cover letter',
   'Generates a cover letter from the profile and the target job.',
   false, null, null, true, 90)
on conflict (feature) do nothing;
