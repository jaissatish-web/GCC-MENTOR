-- Migration 038 — free-tier resumes (TASK-162).
--
-- Founder decision 2026-08-17: a free user can keep ONE resume built from their
-- own typed profile, choose any template, and download it as a PDF. What is paid
-- for is the AI rewrite.
--
-- WHY A COLUMN AND NOT AN INFERENCE. A free resume and an abandoned checkout are
-- currently the same shape: since pay-before-generate (migration 033) starting an
-- optimization inserts a row with is_paid = false and optimized_content = NULL,
-- which is byte-for-byte how a free resume would look. Counting unpaid rows to
-- enforce the one-resume quota would therefore let a user who clicked Optimize
-- and changed their mind lose their free CV. The distinction has to be recorded
-- at creation, not derived afterwards.
--
-- NULL means "created before this migration", and every such row belongs to the
-- paid flow — the only thing that inserted packages was /api/optimize. Readers
-- treat NULL as 'paid' rather than backfilling, on the same reasoning as
-- migrations 035 and 036: a written value would claim something the row never
-- said.
--
-- WHAT THIS COLUMN IS NOT. It is not the access gate. Access is decided by
-- whether a row holds AI-written text — see lib/packageAccess.ts — because that
-- is the thing the user is paying for. `tier` exists for the quota and for
-- honest labelling in the Library, and a client cannot set it.

alter table public.packages
  add column if not exists tier text;

alter table public.packages
  add constraint packages_tier_check
  check (tier is null or tier in ('free', 'paid'));

comment on column public.packages.tier is
  'How this resume was created: free = built from the user own profile, no AI; paid = went through the optimizer. NULL = pre-migration-038, treated as paid. Used for the free-tier quota and Library labelling, NEVER as the access gate — access depends on whether optimized_content holds AI text (lib/packageAccess.ts).';

-- One free resume per user, enforced by the database rather than only by the
-- route that writes it. A partial unique index is the right tool: it constrains
-- exactly the rows that matter and leaves paid resumes unlimited.
create unique index if not exists packages_one_free_per_user
  on public.packages (user_id)
  where tier = 'free';
