-- Migration 044 — packages.skills_order becomes nullable.
--
-- BUG FIX. Migration 033 introduced the two-phase optimize flow: create the
-- package EMPTY (unpaid, ungenerated), pay, then generate into it later. It
-- correctly dropped NOT NULL from `optimized_content` so a row could express
-- "not yet generated" — but `skills_order` needed the exact same relaxation
-- and was missed. It has been NOT NULL since the original packages table
-- (migration 012), and app/api/optimize/route.ts's Phase A insert has always
-- written `skills_order: null` into it, because at creation time no skills
-- have been ordered yet — the model hasn't run.
--
-- The result: every single call to POST /api/optimize (Phase A, creating the
-- package) has been rejected by this NOT NULL constraint, synchronously, no
-- AI call ever reached — which is why the founder saw an INSTANT "Could not
-- start your optimization" with no delay, regardless of whether a job
-- description was attached. Reported 2026-08-18.
--
-- Same semantics as optimized_content: NULL means "not yet generated" here
-- too. Phase B (lib/ai/route.ts's generation step) already writes the real
-- resolved array via resolveSkillsOrder() once the model has actually run.
--
-- Existing rows are unaffected — relaxing NOT NULL to nullable never rewrites
-- data.

alter table public.packages alter column skills_order drop not null;

comment on column public.packages.skills_order is
  'Relevance-ordered skill IDs for this target, resolved by resolveSkillsOrder() after generation. NULL means not yet generated (same convention as optimized_content) — nullable since migration 044, fixing a Phase A insert that had been rejected by NOT NULL since migration 033 introduced the create-then-generate flow.';
