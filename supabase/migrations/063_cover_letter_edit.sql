-- Save the user's own edits to a generated cover letter (2026-10-03).
--
-- The cover-letter page said "changes are not saved — copy or download it":
-- a phone user who polished a letter lost it on leaving the page (launch
-- audit I3). This replaces ONE letter's full_text, found by its id, on a
-- package the caller owns, and stamps edited_at. Same shape and grants as the
-- migration 050 package writers: SQL, SECURITY INVOKER, service_role only,
-- called by the server after it has authenticated the user.
CREATE OR REPLACE FUNCTION public.package_update_cover_letter_text(
  p_package_id  uuid,
  p_user_id     uuid,
  p_letter_id   text,
  p_full_text   text
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH updated AS (
    UPDATE public.packages p
       SET cover_letters = (
             SELECT array_agg(
                      CASE WHEN l->>'id' = p_letter_id
                           THEN l || jsonb_build_object('full_text', p_full_text, 'edited_at', to_jsonb(now()))
                           ELSE l END
                      ORDER BY t.ord)
               FROM unnest(p.cover_letters) WITH ORDINALITY AS t(l, ord)
           )
     WHERE p.id = p_package_id
       AND p.user_id = p_user_id
       AND EXISTS (SELECT 1 FROM unnest(p.cover_letters) AS x(l) WHERE x.l->>'id' = p_letter_id)
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$$;

REVOKE EXECUTE ON FUNCTION public.package_update_cover_letter_text(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.package_update_cover_letter_text(uuid, uuid, text, text) TO service_role;
