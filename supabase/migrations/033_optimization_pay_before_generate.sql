-- Migration 033 — pay before generate (TASK-131).
--
-- BUSINESS CHANGE, founder decision 2026-08-16: the AI optimization must not
-- run until the user has paid. Today /api/optimize generates first and shows a
-- blurred preview to sell the unlock, which means every visitor who never buys
-- still spends real model tokens — measured elsewhere in this codebase at
-- ~8k output tokens for a single run.
--
-- WHY A SCHEMA CHANGE IS NEEDED AT ALL. Payment in this product is applied to
-- an EXISTING package (redeem_promo_code takes a package_id, migration 021),
-- so there is no way to take money before a package row exists. The flow
-- therefore becomes: create the package unpaid and EMPTY -> pay -> generate
-- into it. For the generation step to run later, everything it needs must be
-- on the row. Target fields, job description and level already are.
-- `selectedBlocks` was not — it only ever existed in the request body, because
-- generation happened in the same request.
--
-- optimized_content also has to be allowed to be NULL, which is what
-- distinguishes "bought but not yet generated" from "generated". It was NOT
-- NULL because a package could not previously exist without content.

alter table public.packages
  add column if not exists selected_blocks jsonb;

comment on column public.packages.selected_blocks is
  'Which parts the user chose to optimize (summary + experience ids), captured at package creation so generation can run later, after payment. Null on packages created before migration 033.';

alter table public.packages
  alter column optimized_content drop not null;

comment on column public.packages.optimized_content is
  'NULL means paid-but-not-yet-generated, or created-and-not-yet-paid. Non-null means the AI has produced the resume. Nullable since migration 033 (pay before generate).';
