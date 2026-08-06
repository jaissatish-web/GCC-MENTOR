-- ============================================================================
-- Migration 010 — career_profiles
-- The core data layer, per docs/CAREER_PROFILE.md §2.
-- The most sensitive data store in the product (PII). RLS is mandatory.
-- Passport NUMBER is deliberately absent and must never be added (RULES §3).
-- Additive only. No existing table is dropped or altered.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums (created idempotently — safe to re-run the migration cleanly)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regtype('public.target_country_enum') IS NULL THEN
    CREATE TYPE public.target_country_enum AS ENUM (
      'saudi_arabia', 'uae', 'qatar', 'oman', 'kuwait', 'bahrain', 'generic_gulf'
    );
  END IF;

  IF to_regtype('public.passport_type_enum') IS NULL THEN
    CREATE TYPE public.passport_type_enum AS ENUM ('ECR', 'Non-ECR');
  END IF;

  IF to_regtype('public.readiness_category_enum') IS NULL THEN
    CREATE TYPE public.readiness_category_enum AS ENUM (
      'currently_in_gulf', 'fresher', 'returner', 'experienced_not_in_gulf'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Table: career_profiles
-- One row per user; user_id is unique.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Status
  currently_in_gulf   boolean NOT NULL,
  current_employer    text,
  current_project     text,

  -- Target
  target_job_title    text NOT NULL,
  target_industry     text NOT NULL,
  target_country      public.target_country_enum NOT NULL,
  target_company      text,

  -- Identity & contact (every field has a visibility toggle via field_visibility)
  full_name           text NOT NULL,
  photo_url           text,
  nationality         text,
  date_of_birth       date,
  passport_type       public.passport_type_enum,
  passport_validity_date date,
  visa_status         text,
  visa_transferable   boolean,
  notice_period       text,
  current_location    text,
  phone               text NOT NULL,
  whatsapp            text,
  email               text NOT NULL,
  linkedin_url        text,

  -- Visibility storage. Default: true for all fields EXCEPT passport_type and
  -- date_of_birth which default to false. Hiding a field NEVER deletes data.
  field_visibility    jsonb NOT NULL DEFAULT '{
    "full_name": true,
    "photo": true,
    "nationality": true,
    "date_of_birth": false,
    "passport_type": false,
    "passport_validity": true,
    "visa_status": true,
    "visa_transferable": true,
    "notice_period": true,
    "current_location": true,
    "phone": true,
    "whatsapp": true,
    "email": true,
    "linkedin_url": true,
    "additional_information": true
  }'::jsonb,

  -- Derived / metadata
  readiness_category  public.readiness_category_enum,
  readiness_score     integer CHECK (readiness_score BETWEEN 0 AND 100),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Keep updated_at fresh on write.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS career_profiles_set_updated_at ON public.career_profiles;
CREATE TRIGGER career_profiles_set_updated_at
  BEFORE UPDATE ON public.career_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-only. Required for this table before it is
-- considered complete (migrations/README.md rule 4, RULES §6).
-- ---------------------------------------------------------------------------
ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS career_profiles_owner_all ON public.career_profiles;
CREATE POLICY career_profiles_owner_all
  ON public.career_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
