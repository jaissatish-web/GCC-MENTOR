-- ============================================================================
-- Migration 022 — lock down SECURITY DEFINER EXECUTE grants (Unplanned #18)
--
-- Found 2026-08-07 verifying TASK-051 (migration 021) against the live
-- database, not by trusting the migration files' own REVOKE lines.
--
-- This Supabase project grants EXECUTE on newly created public-schema
-- functions directly to anon and authenticated as a project-level default
-- privilege — a SEPARATE grant from PUBLIC. Every prior SECURITY DEFINER
-- function in this project (016, 018, 021) only ever revoked FROM PUBLIC,
-- which never touched that direct grant, leaving each one callable by any
-- client — even unauthenticated — via Supabase's auto-exposed REST RPC,
-- with attacker-chosen arguments, bypassing every app-level ownership and
-- rate-limit check.
--
-- This migration is additive per supabase/migrations/README.md rule 3 (it
-- does not edit 016/018/021 in place) but exists so that replaying every
-- migration in this folder from scratch on a fresh project reproduces the
-- CURRENT, already-fixed live state — not the original, exploitable one.
-- Already applied directly to the live database 2026-08-07; this file
-- documents that fix for reproducibility. See docs/TASKS.md Unplanned #18
-- and docs/PROJECT_STATUS.md "What just happened" for the full writeup.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.increment_rate_limit(uuid, text, date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_optimization_credit(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid, uuid) FROM anon, authenticated;
