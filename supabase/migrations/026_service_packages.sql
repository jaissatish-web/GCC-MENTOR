-- ============================================================================
-- Migration 026 — service packages, quotas, and a generalized credit ledger
--
-- Founder request 2026-08-09: admin-defined bundles ("Pro package = 3
-- optimizations + 2 cover letters + 1 mock interview"), fully controlled
-- from /admin, no code change to create or edit one. This is the foundation
-- Cover Letter (and later mock interview, Q&A) will be gated behind — built
-- first, deliberately, because those features' paywalls depend on this
-- existing, not the other way around.
--
-- DOES NOT TOUCH the existing single-product flow: `packages` (one row per
-- resume-optimization target), `pricing` (the current ₹499 price row), or
-- `promo_codes`' existing single-resume redemption behavior. All three keep
-- working exactly as they do today — this is new, additive infrastructure
-- alongside them, not a replacement. The one addition to `promo_codes` is a
-- nullable column that changes nothing for existing rows.
--
-- service_key is a free-text convention, not a DB enum (matches
-- rate_limits.action and ai_usage_log.route elsewhere in this schema) —
-- adding a new service later (e.g. 'mock_interview') never needs a
-- migration. Known values as of this migration: 'resume_optimization',
-- 'cover_letter'. Validate the value at the application layer.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) service_packages — admin-defined bundle: a name and a price.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  price_inr   numeric NOT NULL CHECK (price_inr >= 0),
  is_active   boolean NOT NULL DEFAULT true,   -- inactive packages can't be newly purchased, existing grants are unaffected
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS service_packages_set_updated_at ON public.service_packages;
CREATE TRIGGER service_packages_set_updated_at
  BEFORE UPDATE ON public.service_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) service_package_items — the quota lines inside a package.
-- One row per (package, service_key): "this package includes N of this
-- service." A package with no rows here is a name/price with nothing
-- included yet — the admin UI should treat that as incomplete, not silently
-- sellable.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_package_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id  uuid NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  service_key text NOT NULL,
  quota       integer NOT NULL CHECK (quota > 0),
  UNIQUE (package_id, service_key)
);

-- ---------------------------------------------------------------------------
-- 3) user_service_credits — the ledger. One row = one unit of one service,
-- for one user. Same auditable-ledger shape as optimization_credits
-- (migration 018), generalized across service_key instead of being
-- optimization-only, and additionally tracking WHERE it came from.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_service_credits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_key       text NOT NULL,
  source            text NOT NULL CHECK (source IN ('package_purchase', 'admin_grant')),
  source_package_id uuid REFERENCES public.service_packages(id) ON DELETE SET NULL, -- which package purchase granted this, if any
  granted_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,              -- which admin, if source = 'admin_grant'
  reason            text,                                                           -- required at the app layer for admin_grant, same as optimization_credits
  granted_at        timestamptz NOT NULL DEFAULT now(),
  consumed_at       timestamptz  -- NULL = still available. Never deleted — a spent credit is a permanent audit record.
);

CREATE INDEX IF NOT EXISTS user_service_credits_unconsumed_idx
  ON public.user_service_credits (user_id, service_key)
  WHERE consumed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 4) promo_codes gets one new NULLABLE column. Existing rows are unaffected
-- (NULL = "unlocks the single resume-optimization package," exactly today's
-- behavior via the existing redeem_promo_code function, untouched by this
-- migration). A code with package_id set is redeemed through the NEW
-- function below instead — a founder chooses which kind of code to create
-- from the admin UI.
-- ---------------------------------------------------------------------------
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.service_packages(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS — service-role only on all three new tables, same posture as
-- optimization_credits/ai_provider_config/promo_codes: nothing here is ever
-- readable or writable by a normal session. A package's existence/price is
-- served to the client only through a server-rendered admin page or a
-- future public pricing read, never directly.
-- ---------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON public.service_packages FROM anon;
REVOKE ALL PRIVILEGES ON public.service_packages FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.service_packages TO service_role;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON public.service_package_items FROM anon;
REVOKE ALL PRIVILEGES ON public.service_package_items FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_package_items TO service_role;
ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON public.user_service_credits FROM anon;
REVOKE ALL PRIVILEGES ON public.user_service_credits FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_service_credits TO service_role;
ALTER TABLE public.user_service_credits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS service_packages_service_all ON public.service_packages;
  CREATE POLICY service_packages_service_all ON public.service_packages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS service_package_items_service_all ON public.service_package_items;
  CREATE POLICY service_package_items_service_all ON public.service_package_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS user_service_credits_service_all ON public.user_service_credits;
  CREATE POLICY user_service_credits_service_all ON public.user_service_credits
    FOR ALL TO service_role USING (true) WITH CHECK (true);
END $$;

-- ---------------------------------------------------------------------------
-- 5) grant_package_credits — atomic: inserts one user_service_credits row
-- per unit of quota, for every item in the package. Called by promo
-- redemption (below) and will be called by real Razorpay purchase once
-- that's unblocked — same grant path either way, only how payment is
-- confirmed differs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_package_credits(
  p_user_id    uuid,
  p_package_id uuid
)
RETURNS integer  -- number of credit rows inserted
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_i integer;
  v_total integer := 0;
BEGIN
  FOR v_item IN
    SELECT service_key, quota FROM public.service_package_items WHERE package_id = p_package_id
  LOOP
    FOR v_i IN 1..v_item.quota LOOP
      INSERT INTO public.user_service_credits (user_id, service_key, source, source_package_id)
      VALUES (p_user_id, v_item.service_key, 'package_purchase', p_package_id);
      v_total := v_total + 1;
    END LOOP;
  END LOOP;
  RETURN v_total;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) consume_service_credit — atomic, mirrors consume_optimization_credit
-- (migration 018) exactly, generalized to any service_key. FOR UPDATE SKIP
-- LOCKED so two concurrent requests for the same service can't both claim
-- the same last remaining credit.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_service_credit(
  p_user_id     uuid,
  p_service_key text
)
RETURNS uuid  -- the consumed credit's id, or NULL if none available
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.user_service_credits
  SET consumed_at = now()
  WHERE id = (
    SELECT c.id
    FROM public.user_service_credits c
    WHERE c.user_id = p_user_id
      AND c.service_key = p_service_key
      AND c.consumed_at IS NULL
    ORDER BY c.granted_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) redeem_package_promo_code — a NEW function, deliberately separate from
-- the existing redeem_promo_code (migration 021), which stays untouched and
-- keeps working exactly as it does today for single-resume codes. This one
-- is used only for a promo_codes row that has package_id set. Same
-- concurrency shape as redeem_promo_code: row-locked, validates
-- active/not-expired/under-max-redemptions and increments redemption_count
-- in one atomic statement, then grants the package's credits.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_package_promo_code(
  p_code    text,
  p_user_id uuid
)
RETURNS boolean  -- true if redeemed, false if invalid/expired/exhausted/not a package code
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.promo_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.promo_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_row.package_id IS NULL THEN RETURN false; END IF;  -- not a package code — use redeem_promo_code instead
  IF NOT v_row.active THEN RETURN false; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN RETURN false; END IF;
  IF v_row.max_redemptions IS NOT NULL AND v_row.redemption_count >= v_row.max_redemptions THEN RETURN false; END IF;

  UPDATE public.promo_codes
  SET redemption_count = redemption_count + 1
  WHERE code = p_code;

  PERFORM public.grant_package_credits(p_user_id, v_row.package_id);

  RETURN true;
END;
$$;

-- Same REVOKE-then-GRANT lesson applied from the start on all three new
-- functions (Unplanned #18) — PUBLIC and this project's separate
-- anon/authenticated default privilege both revoked, together, in this file.
REVOKE EXECUTE ON FUNCTION public.grant_package_credits(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_package_credits(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_package_credits(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.consume_service_credit(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_service_credit(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_service_credit(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.redeem_package_promo_code(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_package_promo_code(text, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_package_promo_code(text, uuid) TO service_role;
