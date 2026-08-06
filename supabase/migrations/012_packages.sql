-- ============================================================================
-- Migration 012 — packages
-- Per docs/DASHBOARD_LIBRARY.md §2. One row per job target optimized for.
-- Additive only. No table is dropped or altered (including career_profiles,
-- TASK-007/010, and the child tables, TASK-008/011).
--
-- Schema reservations: the four nullable Phase 2–4 columns exist from day
-- one but are never populated or given UI until their phase arrives
-- (DASHBOARD_LIBRARY.md §2 "Phase 2–4 slots").
--
-- No constraint assumes one payment equals one package — that is an open
-- decision (docs/RULES.md §5) and this table must stay model-neutral.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regtype('public.optimization_level_enum') IS NULL THEN
    CREATE TYPE public.optimization_level_enum AS ENUM ('easy', 'moderate', 'high');
  END IF;

  IF to_regtype('public.package_status_enum') IS NULL THEN
    CREATE TYPE public.package_status_enum AS ENUM (
      'applied', 'shortlisted', 'interview', 'visa_processing', 'offer'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Table: packages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.packages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- RLS key
  profile_id            uuid NOT NULL REFERENCES public.career_profiles(id) ON DELETE CASCADE, -- source of truth for fixed fields

  -- Target
  target_job_title      text NOT NULL,
  target_country        public.target_country_enum NOT NULL,
  target_company        text,
  target_industry       text NOT NULL,     -- persona selection
  job_description       text,              -- the JD it was optimized against, if provided

  -- Optimization
  optimization_level    public.optimization_level_enum NOT NULL,
  status                public.package_status_enum NOT NULL DEFAULT 'applied',

  -- Output (structured, never a flat file)
  optimized_content     jsonb NOT NULL,    -- docs/DASHBOARD_LIBRARY.md §4
  skills_order          jsonb NOT NULL,    -- relevance-ordered skill IDs for this target
  field_visibility_snapshot jsonb NOT NULL, -- visibility state at generation time

  -- Payment
  is_paid               boolean NOT NULL DEFAULT false, -- gates download
  payment_id            text,              -- Razorpay reference

  -- Metadata
  generation_count      integer NOT NULL DEFAULT 1, -- incremented on re-optimize
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Phase 2–4 slots — schema reservations only. Create now, leave null,
  -- build no UI for them (docs/DASHBOARD_LIBRARY.md §2).
  ats_score_card        jsonb,
  cover_letters         jsonb[],
  interview_questions   jsonb,
  mock_interview_runs   jsonb[]
);

-- Keep updated_at fresh on write.
DROP TRIGGER IF EXISTS packages_set_updated_at ON public.packages;
CREATE TRIGGER packages_set_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-only (user_id is the RLS key).
-- ---------------------------------------------------------------------------
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS packages_owner_all ON public.packages;
CREATE POLICY packages_owner_all
  ON public.packages
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
