-- ============================================================================
-- Migration 030 — target_country becomes optional
--
-- Founder decision, 2026-08-10: target_country is not actually a
-- format-changing field — lib/ai/buildOptimizationPrompt.ts's GULF_FORMAT_NOTE
-- has always applied one country-agnostic Gulf convention (a documented
-- decision from TASK-018, not new), and target_country was never rendered
-- on the resume itself. Requiring it and labelling it "sets CV format
-- conventions" (app/optimize/target/page.tsx) was misleading — the field
-- exists as informational targeting context, same standing as
-- target_company (already nullable) or current_location, not a functional
-- switch. Making it optional matches what it has always actually done.
--
-- Additive-in-spirit: no column dropped, no data destroyed. Existing rows
-- keep their current value; only the constraint is relaxed.
-- ============================================================================

ALTER TABLE public.career_profiles ALTER COLUMN target_country DROP NOT NULL;
ALTER TABLE public.packages ALTER COLUMN target_country DROP NOT NULL;
