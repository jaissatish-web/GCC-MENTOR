-- ============================================================================
-- Migration 018 — optimization_credits (TASK-045, manual credit grant)
--
-- Per docs/ADMIN.md §2.3: "A button to grant a user one free optimization.
-- This is the fix for 'I paid but something broke' support cases. Implementation:
-- insert a credit row the optimize flow checks before requiring payment. Every
-- grant is logged with admin ID, target user, timestamp and reason."
--
-- This is the ledger behind §6's support loop: user emails -> founder finds them
-- in the admin users list -> founder grants a credit -> user re-runs at no cost.
--
-- One row = one free optimization. A row is consumed exactly once, by the
-- optimize flow, which then creates that package already paid. The row is NOT
-- deleted on consumption — it is stamped, so the grant history stays auditable
-- (who granted it, why, when, and which package it paid for).
--
-- Additive: creates one table and one function. Drops/alters nothing.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.optimization_credits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- who it's for
  granted_by          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- which admin
  reason              text NOT NULL,               -- required: why it was granted
  granted_at          timestamptz NOT NULL DEFAULT now(),
  -- Consumption stamp. NULL = still available. Never deleted, so a spent credit
  -- remains a permanent audit record rather than vanishing.
  consumed_at         timestamptz,
  -- ON DELETE SET NULL, not CASCADE: if the user later deletes the package this
  -- credit paid for (TASK-037 hard delete), the GRANT record must survive — the
  -- audit trail of "the founder gave this person a free run" outlives the
  -- artifact it produced.
  consumed_package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL
);

-- The hot path is "does this user have an unconsumed credit" — index for it.
CREATE INDEX IF NOT EXISTS optimization_credits_unconsumed_idx
  ON public.optimization_credits (user_id)
  WHERE consumed_at IS NULL;

-- ============================================================================
-- RLS — service-role only, matching pii_access_log (migration 013).
--
-- Nothing in the browser reads or writes this table: admins grant through a
-- server action (app/admin/actions.ts) and the optimize route consumes through
-- the service-role client. Granting EXECUTE/SELECT to `authenticated` would
-- mean a user could read — or worse, an INSERT policy would let them mint —
-- their own free optimizations. Keep it closed.
-- ============================================================================
REVOKE ALL PRIVILEGES ON public.optimization_credits FROM anon;
REVOKE ALL PRIVILEGES ON public.optimization_credits FROM authenticated;
REVOKE ALL PRIVILEGES ON public.optimization_credits FROM service_role;

GRANT SELECT, INSERT, UPDATE ON public.optimization_credits TO service_role;

ALTER TABLE public.optimization_credits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS optimization_credits_service_all ON public.optimization_credits;
  CREATE POLICY optimization_credits_service_all
    ON public.optimization_credits
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  -- Deliberately NO policy for `authenticated` or `anon`: a user must never be
  -- able to see, create, or alter their own credits.
END $$;

-- ============================================================================
-- Atomic consumption.
--
-- WHY A FUNCTION AND NOT read-then-write IN APP CODE: this is exactly the race
-- that migration 016 was written to fix for rate limits. Two concurrent
-- optimize requests from the same user could both SELECT the same unconsumed
-- credit row and both treat it as theirs — granting two free optimizations from
-- one credit. Real money, and the realistic trigger (an impatient user
-- double-clicking "Optimize") is mundane, not adversarial.
--
-- FOR UPDATE SKIP LOCKED makes this safe: concurrent callers each lock a
-- DIFFERENT unconsumed row, or find none and get NULL. A single statement,
-- one round trip, no read-then-write window.
--
-- Returns the consumed credit's id, or NULL when the user has none available.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.consume_optimization_credit(
  p_user_id    uuid,
  p_package_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.optimization_credits
  SET consumed_at = now(),
      consumed_package_id = p_package_id
  WHERE id = (
    SELECT c.id
    FROM public.optimization_credits c
    WHERE c.user_id = p_user_id
      AND c.consumed_at IS NULL
    ORDER BY c.granted_at        -- oldest grant first
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING id INTO v_id;

  RETURN v_id;  -- NULL when no credit was available
END;
$$;

-- SECURITY DEFINER + Supabase's auto-exposed RPC endpoints means EXECUTE must be
-- locked down explicitly. Postgres grants EXECUTE on new functions to PUBLIC by
-- default (functions are opt-out, tables are opt-in), so without this REVOKE any
-- authenticated caller could invoke it directly with an arbitrary p_user_id.
-- Here that would be worse than the rate-limit IDOR migration 016 closed: a
-- caller could burn another user's credit, or — passing their own id — mint
-- themselves a paid package for free. Same explicit REVOKE-then-GRANT pattern as
-- migrations 013, 015 and 016.
REVOKE EXECUTE ON FUNCTION public.consume_optimization_credit(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_optimization_credit(uuid, uuid) TO service_role;
