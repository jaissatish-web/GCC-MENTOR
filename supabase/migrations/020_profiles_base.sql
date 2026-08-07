-- ============================================================================
-- Migration 020 — profiles (base table)
--
-- GAP FOUND APPLYING MIGRATIONS TO A GENUINELY FRESH PROJECT, 2026-08-07: every
-- migration from 013 onward, and docs/ADMIN.md §1 ("Add an is_admin boolean to
-- profiles"), assumed `public.profiles` already existed — inherited from
-- whatever Supabase project this was originally written against. It does not
-- exist here. Migration 013's `ALTER TABLE public.profiles ADD COLUMN...`
-- would fail outright without this first.
--
-- SCOPE: only what the LIVE app code actually reads/writes. Grepped every
-- `.from('profiles')` call — only two, both read-only: `middleware.ts` and
-- `lib/admin/adminAuth.ts`, both `.select('is_admin').eq('user_id', ...)`.
-- (`reference/*.reference.ts` files touch profiles more broadly, but those
-- are parked donor code, not live — docs/AUDIT.md.) So: `user_id` + `is_admin`
-- only, not a bigger profile schema than anything here actually uses.
--
-- Must run BEFORE 013 — numbered 020 (the next unused number; migrations
-- 013-019 already existed, reviewed, under those numbers, and this project's
-- own rule is numbers are never reused/renumbered) but applied out of
-- numeric order, this one time, because 013 has a hard runtime dependency on
-- it that wasn't visible until applying against a truly empty database.
-- Documented here and in docs/TASKS.md's Unplanned findings.
--
-- SECURITY — the reason this needed real thought, not just a CREATE TABLE:
-- `lib/admin/adminAuth.ts`'s own comment already establishes the intended
-- shape ("reading the CALLER'S OWN profiles.is_admin row is always permitted
-- under normal RLS") — so authenticated users need SELECT on their own row.
-- But an owner-all policy (the pattern every other user-owned table in this
-- project uses) would also let a user UPDATE their own row and set
-- is_admin = true themselves — a real privilege-escalation hole, not a
-- hypothetical one. So: SELECT-only for `authenticated` on their own row.
-- No INSERT/UPDATE/DELETE policy for authenticated at all. Row creation is
-- automatic (trigger below, SECURITY DEFINER); the is_admin flag itself is
-- only ever changed by direct SQL (docs/ADMIN.md §1: "Set the founder's flag
-- manually via SQL") or the service-role client — never a client write path.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Owner can read their OWN row only. Deliberately no INSERT/UPDATE/DELETE
  -- policy for `authenticated` — see the security note above.
  DROP POLICY IF EXISTS profiles_owner_select ON public.profiles;
  CREATE POLICY profiles_owner_select
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
END $$;

-- ---------------------------------------------------------------------------
-- Auto-create a profiles row for every new signup (standard Supabase
-- pattern) — otherwise a brand-new user has no row at all, and the founder
-- would have nothing to flip is_admin on after signing up. SECURITY DEFINER
-- so it can insert despite the table having no authenticated INSERT policy;
-- runs as the function owner, not the triggering user.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- No EXECUTE grant needed for handle_new_user_profile: it is invoked only by
-- the trigger itself (as the function's definer), never called directly by
-- any role, so there is no PUBLIC-EXECUTE exposure to REVOKE here (unlike
-- the RPC-exposed functions in migrations 016/018, which Supabase
-- auto-exposes over its API and therefore do need an explicit REVOKE).
