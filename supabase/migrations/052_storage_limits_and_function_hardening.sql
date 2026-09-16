-- ============================================================================
-- Migration 052 — photo bucket limits + function search-path hardening
-- Audit 2026-09-15: M02 (profile-photos bucket had no size/type limits, so a
-- direct Storage API upload bypassed the route's checks), L02 (mutable search
-- path on two functions flagged by the Supabase advisor).
--
-- Additive/tightening only. Existing photos are not touched: bucket limits are
-- enforced by Storage on NEW uploads.
-- ============================================================================

-- 1) Match lib/storage/profilePhoto.ts exactly: 5 MiB, JPEG/PNG/WebP.
--    The route still validates size and the file signature itself; this makes
--    Storage refuse the same things when the route is bypassed.
UPDATE storage.buckets
   SET file_size_limit    = 5242880,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'profile-photos';

-- 2) Pin search_path. set_updated_at only touches NEW; handle_new_user_profile
--    already qualifies public.profiles. Behaviour is unchanged; a hostile object
--    earlier on a caller's search_path can no longer shadow what they reference.
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user_profile() SET search_path = public, pg_temp;

-- 3) handle_new_user_profile is a SECURITY DEFINER trigger function. Trigger
--    firing does not check EXECUTE, so removing it from client roles changes
--    nothing for sign-up and removes a needless RPC surface.
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;
