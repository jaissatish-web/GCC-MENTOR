-- ============================================================================
-- Migration 025 — prompt_templates
--
-- Founder request 2026-08-09: prompt wording should be editable from /admin,
-- not hard-coded, same reasoning as migration 019 (AI provider/model/key) —
-- "I'm a non-coder, I need to be able to change things without you."
--
-- SCOPE, deliberately narrow — read this before adding a row for anything
-- else. Every generation prompt in this product is built from two kinds of
-- text:
--   1. FRAMING — persona/tone/intro wording. Safe to make editable: changing
--      it changes voice, not safety.
--   2. STRUCTURAL/SAFETY — the grounding constraint (docs/PROMPTS.md's
--      "ABSOLUTE CONSTRAINT" block, lib/ai/grounding.ts) and the output JSON
--      schema instructions. These stay hard-coded in application code,
--      ALWAYS, no exceptions — an admin-editable grounding rule would let
--      someone accidentally (or someone with access maliciously) weaken the
--      product's core no-invention promise, and an admin-editable JSON
--      schema would silently break the parser/validator that reads the
--      model's response. Nothing in this table may ever replace either.
--
-- This migration only wires up the ATS scanner's intro/framing paragraph
-- (key 'ats_scan_intro', lib/ai/atsScorePrompt.ts) as the first, lowest-risk
-- template — it's the newest prompt, self-contained, with no byte-verified
-- spec behind it (unlike the optimization prompt's persona strings, which
-- TASK-017 verified byte-for-byte against docs/PROMPTS.md §3 and are NOT
-- touched here). Extending this to the optimization/extraction prompts is a
-- deliberate follow-up, not done in this pass — see docs/TASKS.md.
--
-- SERVICE-ROLE ONLY, same posture as ai_provider_config (migration 019):
-- no anon/authenticated policy at all.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prompt_templates (
  key         text PRIMARY KEY,        -- e.g. 'ats_scan_intro'
  content     text NOT NULL,
  description text,                    -- admin-facing hint of what this controls
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS prompt_templates_set_updated_at ON public.prompt_templates;
CREATE TRIGGER prompt_templates_set_updated_at
  BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE ALL PRIVILEGES ON public.prompt_templates FROM anon;
REVOKE ALL PRIVILEGES ON public.prompt_templates FROM authenticated;
REVOKE ALL PRIVILEGES ON public.prompt_templates FROM service_role;

GRANT SELECT, INSERT, UPDATE ON public.prompt_templates TO service_role;

ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS prompt_templates_service_all ON public.prompt_templates;
  CREATE POLICY prompt_templates_service_all
    ON public.prompt_templates
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  -- Deliberately NO policy for `authenticated` or `anon`.
END $$;

-- Seed the one template this migration wires up, with today's existing
-- hard-coded wording as the default — editing it from /admin changes the
-- live prompt immediately; leaving it alone changes nothing.
INSERT INTO public.prompt_templates (key, content, description)
VALUES (
  'ats_scan_intro',
  'You are a Gulf-market resume/CV readiness analyst. You evaluate a resume''s structure, clarity and fit for Gulf (Saudi Arabia, UAE, Qatar, Oman, Kuwait, Bahrain) recruitment, optionally against a specific job description.',
  'Free ATS/Gulf-readiness scanner: the opening persona/tone paragraph only. Does not affect scoring rules, the JSON output format, or the no-invention constraint below it — those stay fixed for safety and cannot be edited here.'
)
ON CONFLICT (key) DO NOTHING;
