-- ============================================================================
-- Migration 021 — promo_codes (TASK-051)
--
-- Founder request 2026-08-07: the founder is based in Saudi Arabia and cannot
-- complete Razorpay's India-only KYC, so TASK-042/043 (real payment) stay
-- blocked indefinitely. Launch strategy instead: the founder issues promo
-- codes that unlock a package's paid deliverable without Razorpay — starting
-- with friends/beta testers. Payment-adjacent, so this migration follows the
-- same review standing as 013/016/018 (docs/RULES.md §4).
--
-- ONE ROW PER CODE, not one row per redemption (unlike optimization_credits,
-- migration 018's per-grant ledger) — a code is reusable up to
-- max_redemptions (NULL = unlimited), matching "give my beta testers one
-- code" better than minting a unique code per person.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.promo_codes (
  code              text PRIMARY KEY,
  description       text NOT NULL,
  max_redemptions   integer CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count  integer NOT NULL DEFAULT 0,
  expires_at        timestamptz,
  active            boolean NOT NULL DEFAULT true,
  created_by        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS — service-role only, matching pii_access_log/optimization_credits/
-- ai_provider_config. A code's existence/validity must never be directly
-- queryable by a client — only through the rate-limited redemption route.
-- ---------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON public.promo_codes FROM anon;
REVOKE ALL PRIVILEGES ON public.promo_codes FROM authenticated;
REVOKE ALL PRIVILEGES ON public.promo_codes FROM service_role;

GRANT SELECT, INSERT, UPDATE ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS promo_codes_service_all ON public.promo_codes;
  CREATE POLICY promo_codes_service_all
    ON public.promo_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  -- Deliberately NO policy for `authenticated` or `anon`.
END $$;

-- ============================================================================
-- Atomic redemption.
--
-- WHY A FUNCTION AND NOT read-then-write IN APP CODE: same race class as
-- migrations 016/018. A code sitting at its last remaining use, redeemed by
-- two concurrent requests, must not both succeed. FOR UPDATE row-locks the
-- promo_codes row so validation + increment happen as one atomic statement.
--
-- Also flips packages.is_paid in the SAME function/transaction as the
-- redemption-count increment — never separately in app code — so a crashed
-- request between "code consumed" and "package unlocked" cannot happen; both
-- succeed together or neither does.
--
-- Returns true on success, false for any failure (code not found, inactive,
-- expired, exhausted, package not found/not owned/already paid) — the caller
-- decides what to tell the user; this function only reports success/failure,
-- never partial state.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code       text,
  p_package_id uuid,
  p_user_id    uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_row record;
  v_pkg_row  record;
BEGIN
  -- Lock the code row first — this is what makes the whole function atomic
  -- under concurrent redemptions of the same code.
  SELECT * INTO v_code_row
  FROM public.promo_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_code_row.active IS NOT true THEN
    RETURN false;
  END IF;

  IF v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at <= now() THEN
    RETURN false;
  END IF;

  IF v_code_row.max_redemptions IS NOT NULL
     AND v_code_row.redemption_count >= v_code_row.max_redemptions THEN
    RETURN false;
  END IF;

  -- Package must exist, belong to the caller, and not already be paid — a
  -- promo code unlocks ONE package, it does not double-pay an already-unlocked
  -- one (that would just waste a redemption for nothing).
  SELECT * INTO v_pkg_row
  FROM public.packages
  WHERE id = p_package_id
    AND user_id = p_user_id
    AND is_paid = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.promo_codes
  SET redemption_count = redemption_count + 1
  WHERE code = p_code;

  UPDATE public.packages
  SET is_paid = true,
      payment_id = 'promo:' || p_code,
      status = 'applied'
  WHERE id = p_package_id;

  RETURN true;
END;
$$;

-- SECURITY DEFINER + Supabase's auto-exposed RPC endpoints means EXECUTE must
-- be locked down explicitly, same reasoning as migrations 016/018: without
-- this REVOKE, any authenticated caller could invoke this RPC directly over
-- Supabase's REST API with an arbitrary p_user_id/p_package_id and unlock
-- someone else's package for free — the function's own p_user_id check only
-- protects anything once EXECUTE is already restricted to service_role,
-- i.e. once the only caller is our own server-side route, which always
-- passes the real authenticated session's id, never client-supplied input.
-- The route itself ALSO scopes the package to the caller before calling
-- this — two independent ownership checks, not one relying on the other.
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid, uuid) TO service_role;
