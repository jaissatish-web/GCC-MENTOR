-- ============================================================================
-- Migration 011 — career_profiles child tables
-- Per docs/CAREER_PROFILE.md §3. All are user-owned, RLS-protected, and
-- reference career_profiles.id with ON DELETE CASCADE.
-- Additive only. No table is dropped or altered, including career_profiles
-- (TASK-007, migration 010).
--
-- These child tables do NOT carry user_id directly. Ownership is resolved
-- through the parent: a row belongs to the authenticated user iff its
-- profile_id points at a career_profiles row whose user_id = auth.uid().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profile_work_experience
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_work_experience (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.career_profiles(id) ON DELETE CASCADE,
  company     text NOT NULL,
  role        text NOT NULL,
  start_date  date NOT NULL,
  end_date    date,                     -- null = current role
  location    text,
  description text,
  highlights  text[],
  sort_order  integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- profile_skills
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.career_profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  sort_order  integer NOT NULL,         -- user's canonical order; never mutated by AI
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- profile_certifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_certifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.career_profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  issuer      text,
  issue_date  date,
  expiry_date date,
  sort_order  integer NOT NULL,         -- user's canonical order; never mutated by AI
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- profile_education
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_education (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     uuid NOT NULL REFERENCES public.career_profiles(id) ON DELETE CASCADE,
  degree         text NOT NULL,
  institution    text NOT NULL,
  field_of_study text,
  start_year     integer,
  end_year       integer,
  sort_order     integer NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- profile_additional_information
-- MVP scope: one section, one show/hide toggle for the whole block.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_additional_information (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.career_profiles(id) ON DELETE CASCADE,
  label       text NOT NULL,            -- AI suggests it; user can rename
  value       text NOT NULL,
  sort_order  integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Row Level Security — owner-only, resolved via the parent career_profiles row.
-- ============================================================================
ALTER TABLE public.profile_work_experience        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_skills                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_certifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_education              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_additional_information ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profile_work_experience',
    'profile_skills',
    'profile_certifications',
    'profile_education',
    'profile_additional_information'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_owner_all ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_owner_all ON public.%I
         FOR ALL TO authenticated
         USING ( EXISTS (
           SELECT 1 FROM public.career_profiles cp
           WHERE cp.id = %I.profile_id AND cp.user_id = auth.uid()
         ) )
         WITH CHECK ( EXISTS (
           SELECT 1 FROM public.career_profiles cp
           WHERE cp.id = %I.profile_id AND cp.user_id = auth.uid()
         ) )',
      t, t, t, t
    );
  END LOOP;
END $$;
