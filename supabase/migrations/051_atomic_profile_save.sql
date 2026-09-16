-- ============================================================================
-- Migration 051 — one-transaction Career Profile save with a version check
-- Audit 2026-09-15: H08 (profile save could partially commit across parent and
-- child tables; a stale tab could silently overwrite newer work).
--
-- save_career_profile() does what PUT /api/profile did in six separate calls —
-- parent upsert, then upsert-by-id / insert / delete-absent for each of the
-- five child tables — inside ONE function call, which Postgres runs as one
-- transaction. Any failure rolls the whole save back; nothing half-written.
--
-- SECURITY INVOKER, EXECUTE for `authenticated` only. It runs as the signed-in
-- caller, so every statement is still filtered by the existing owner RLS
-- policies on career_profiles and the child tables. The caller is taken from
-- auth.uid(), never from an argument, so there is no user id to forge.
--
-- VERSION CHECK. p_expected_updated_at is the `updated_at` the editor loaded.
-- If the stored row is newer, nothing is written and the result is
-- {status: 'conflict'}. NULL skips the check — the behaviour every existing
-- caller had — so callers can adopt it one at a time. Compared at millisecond
-- precision because a browser round-trips timestamps through JS Date.
--
-- The route keeps doing validation, date normalisation, readiness scoring and
-- key whitelisting in TypeScript; this function only does the writes. Column
-- lists are derived from the JSON keys actually sent, exactly as the previous
-- PostgREST upserts behaved: a key that is not sent is not touched.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_career_profile(
  p_profile              jsonb,
  p_children             jsonb,
  p_expected_updated_at  timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_existing   public.career_profiles%ROWTYPE;
  v_exists     boolean;
  v_pid        uuid;
  v_updated    timestamptz;
  v_cols       text[];
  v_sql        text;
  v_pair       record;
  v_rows       jsonb;
  v_keep       uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'save_career_profile: not authenticated' USING ERRCODE = '28000';
  END IF;
  IF jsonb_typeof(p_profile) <> 'object' THEN
    RAISE EXCEPTION 'save_career_profile: profile must be an object' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing FROM public.career_profiles WHERE user_id = v_uid FOR UPDATE;
  v_exists := FOUND;

  IF v_exists AND p_expected_updated_at IS NOT NULL
     AND date_trunc('milliseconds', v_existing.updated_at) > date_trunc('milliseconds', p_expected_updated_at) THEN
    RETURN jsonb_build_object('status', 'conflict', 'updated_at', v_existing.updated_at);
  END IF;

  -- Parent columns: keys sent ∩ real columns, minus identity/bookkeeping and the
  -- photo path (owned by the photo route).
  SELECT coalesce(array_agg(a.attname::text ORDER BY a.attnum), '{}') INTO v_cols
    FROM pg_attribute a
   WHERE a.attrelid = 'public.career_profiles'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
     AND a.attname::text NOT IN ('id', 'user_id', 'created_at', 'updated_at', 'photo_url')
     AND p_profile ? a.attname::text;

  IF NOT v_exists THEN
    v_sql := format(
      'INSERT INTO public.career_profiles (user_id%s) SELECT $2%s FROM jsonb_populate_record(NULL::public.career_profiles, $1) r RETURNING id, updated_at',
      (SELECT coalesce(string_agg(', ' || quote_ident(c), ''), '') FROM unnest(v_cols) c),
      (SELECT coalesce(string_agg(', r.' || quote_ident(c), ''), '') FROM unnest(v_cols) c)
    );
    EXECUTE v_sql USING p_profile, v_uid INTO v_pid, v_updated;
  ELSE
    v_sql := format(
      'UPDATE public.career_profiles t SET %s FROM jsonb_populate_record(NULL::public.career_profiles, $1) r WHERE t.user_id = $2 RETURNING t.id, t.updated_at',
      CASE WHEN cardinality(v_cols) = 0 THEN 'updated_at = now()'
           ELSE (SELECT string_agg(quote_ident(c) || ' = r.' || quote_ident(c), ', ') FROM unnest(v_cols) c)
      END
    );
    EXECUTE v_sql USING p_profile, v_uid INTO v_pid, v_updated;
  END IF;

  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'save_career_profile: profile row not written';
  END IF;

  -- Children: for each collection that was SENT, delete rows absent from it,
  -- then upsert by id (rows without an id are inserted with a new one).
  IF p_children IS NOT NULL AND jsonb_typeof(p_children) = 'object' THEN
    FOR v_pair IN
      SELECT * FROM (VALUES
        ('work_experience',        'profile_work_experience'),
        ('skills',                 'profile_skills'),
        ('certifications',         'profile_certifications'),
        ('education',              'profile_education'),
        ('additional_information', 'profile_additional_information')
      ) AS m(json_key, table_name)
    LOOP
      CONTINUE WHEN NOT (p_children ? v_pair.json_key);
      v_rows := p_children -> v_pair.json_key;
      IF jsonb_typeof(v_rows) <> 'array' THEN
        RAISE EXCEPTION 'save_career_profile: % must be an array', v_pair.json_key USING ERRCODE = '22023';
      END IF;

      SELECT coalesce(array_agg((e->>'id')::uuid), '{}') INTO v_keep
        FROM jsonb_array_elements(v_rows) e
       WHERE coalesce(e->>'id', '') <> '';

      EXECUTE format('DELETE FROM public.%I WHERE profile_id = $1 AND NOT (id = ANY ($2))', v_pair.table_name)
        USING v_pid, v_keep;

      CONTINUE WHEN jsonb_array_length(v_rows) = 0;

      SELECT coalesce(array_agg(a.attname::text ORDER BY a.attnum), '{}') INTO v_cols
        FROM pg_attribute a
       WHERE a.attrelid = format('public.%I', v_pair.table_name)::regclass
         AND a.attnum > 0 AND NOT a.attisdropped
         AND a.attname::text NOT IN ('id', 'profile_id', 'created_at')
         AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_rows) e WHERE e ? a.attname::text);

      v_sql := format(
        'INSERT INTO public.%1$I (id, profile_id%2$s) '
        'SELECT coalesce(r.id, gen_random_uuid()), $1%3$s '
        'FROM jsonb_populate_recordset(NULL::public.%1$I, $2) r '
        'ON CONFLICT (id) DO UPDATE SET profile_id = EXCLUDED.profile_id%4$s',
        v_pair.table_name,
        (SELECT coalesce(string_agg(', ' || quote_ident(c), ''), '') FROM unnest(v_cols) c),
        (SELECT coalesce(string_agg(', r.' || quote_ident(c), ''), '') FROM unnest(v_cols) c),
        (SELECT coalesce(string_agg(', ' || quote_ident(c) || ' = EXCLUDED.' || quote_ident(c), ''), '') FROM unnest(v_cols) c)
      );
      EXECUTE v_sql USING v_pid, v_rows;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('status', 'saved', 'profile_id', v_pid, 'updated_at', v_updated);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_career_profile(jsonb, jsonb, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_career_profile(jsonb, jsonb, timestamptz) TO authenticated, service_role;
