-- ============================================================================
-- Migration 028 — anonymous_analysis_sessions
--
-- Phase 2 of docs/GCC_READINESS_JOB_MATCH.md (founder spec, §15-17): lets an
-- anonymous visitor scan a resume, then claim that exact result on signup
-- without re-uploading or re-running anything.
--
-- This is new PII exposure that did NOT exist before — TASK-049's /ats-scan
-- deliberately wrote nothing to the database ("storing a stranger's resume
-- text with no account and no consent flow is a bigger PII footprint than a
-- stateless scan needs"). This migration is that exact tradeoff, now made
-- deliberately, because the founder's spec explicitly asks for it (§16:
-- "Anonymous analysis data must be temporarily stored. Do NOT rely only on
-- browser memory.") — with the mitigations the earlier ticket said such a
-- feature would need: a defined expiration (below), no client-readable
-- lookup path (service-role only, no RLS policy for anon/authenticated —
-- same posture as promo_codes/anonymous_rate_limits/optimization_credits),
-- and single-use deletion on claim, not indefinite retention.
--
-- No RLS-bypassable read path: a client never queries this table directly.
-- The ONLY way data leaves this table is server code that first verifies a
-- possession-proof token (see app/api/ats-scan/route.ts and
-- app/api/anonymous-session/claim/route.ts) — the row's own uuid `id` is
-- never treated as a capability; a caller must additionally prove they hold
-- the raw token that hashes to token_hash. Storing token_hash (not the raw
-- token) means a database compromise alone does not hand out usable tokens,
-- same principle as password storage.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anonymous_analysis_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SHA-256 hex of the raw session token held in the client's HttpOnly
  -- cookie. The raw token is never stored. Unique so a lookup is a direct
  -- equality match, not a scan.
  token_hash          text NOT NULL UNIQUE,

  -- Same salted-IP-hash identity as anonymous_rate_limits (migration 023) —
  -- not used for lookup (token_hash is), kept only so abuse investigation
  -- can correlate a session back to a rate-limit bucket without storing a
  -- raw IP a second time.
  identity_hash       text NOT NULL,

  -- The raw extracted text and the structured draft built from it
  -- (types/careerProfile.ts CareerProfileDraft). Both are needed: the draft
  -- pre-fills the Career Profile on claim; the raw text is kept so a future
  -- re-analysis (e.g. once the Job Match engine, phase 3, exists) does not
  -- require asking the person to upload again before that feature ships.
  resume_text         text NOT NULL,
  extracted_profile    jsonb NOT NULL,
  job_description      text,

  -- The existing free-scan result (lib/ai/atsScorePrompt.ts AtsScoreResult).
  -- Nullable: a row can exist from extraction alone if the score call fails
  -- but extraction succeeded — better to keep the draft than discard it over
  -- an unrelated scoring failure.
  ats_score_result     jsonb,

  created_at          timestamptz NOT NULL DEFAULT now(),
  -- Expiration is mandatory (spec: "a defined expiration period and privacy/
  -- deletion policy"), not left to a cron job someone might forget to write.
  -- Every read path filters WHERE expires_at > now() AND a scheduled cleanup
  -- can delete expired rows outright — either is sufficient for the privacy
  -- property this column exists to provide; enforcing it in every read means
  -- correctness doesn't depend on the cleanup job actually running.
  expires_at          timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS anonymous_analysis_sessions_expires_at_idx
  ON public.anonymous_analysis_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- Row Level Security — service-role only, same posture as promo_codes
-- (migration 021) and anonymous_rate_limits (migration 023). There is no
-- session to scope an owner policy to (the whole point of this table is
-- data belonging to someone who is, by definition, not authenticated yet),
-- and the content is a stranger's resume text — the only two real options
-- are "no client access" or "everyone's access," and the second is not
-- acceptable for this data. All access goes through server route handlers
-- using the service-role client, gated by the token_hash proof described
-- above, never through a client-facing table read.
-- ---------------------------------------------------------------------------
ALTER TABLE public.anonymous_analysis_sessions ENABLE ROW LEVEL SECURITY;
-- Deliberately no policy for anon/authenticated — RLS enabled with zero
-- policies means every role except service_role (which bypasses RLS
-- entirely) is denied by default.
