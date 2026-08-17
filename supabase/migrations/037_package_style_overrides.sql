-- Migration 037 — user-adjustable resume styling (TASK-152).
--
-- Founder decision 2026-08-17: a user should be able to change the text style,
-- size and colour of their resume in the preview, and save it.
--
-- WHY A SEPARATE COLUMN, not part of document_snapshot. `document_snapshot`
-- (migration 034) is the frozen CONTENT of a delivered resume — the words. This
-- is presentation, exactly like `template_id` (migration 035), and it belongs
-- beside it for the same reason: changing how a resume looks must never be able
-- to touch what it says. Keeping them apart makes that true by construction
-- rather than by being careful, and it means the styling control cannot become
-- another way to rewrite a paid document.
--
-- WHY JSONB AND NOT THREE COLUMNS. The set of adjustable properties will grow
-- (line spacing, heading style, margins are all plausible next). A jsonb blob
-- absorbs that without a migration per knob. The tradeoff is that the database
-- cannot constrain the values, so validation lives in lib/resumeStyle.ts and is
-- enforced server-side in PATCH /api/packages/[id] before any write — the
-- column stores only values that have already been checked against a fixed
-- allow-list. Nothing here is ever interpolated into CSS as free text.
--
-- NULL means "template defaults", which is what every existing resume gets.
-- Deliberately not backfilled: a written value would claim the user made a
-- choice they never made — same reasoning as migrations 035 and 036.

alter table public.packages
  add column if not exists style_overrides jsonb;

comment on column public.packages.style_overrides is
  'User-chosen presentation overrides for this resume: font family, text size, accent colour. Validated against a fixed allow-list in lib/resumeStyle.ts before write — never free-text CSS. NULL = template defaults. Presentation only; the delivered content lives in document_snapshot.';
