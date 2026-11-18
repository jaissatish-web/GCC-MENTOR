-- DATE-096: additive, precision-aware date facts. Authoring/testing only; no backfill.
-- Anchors are an encoding, never evidence of a supplied month/day.
ALTER TABLE public.profile_work_experience
  ADD COLUMN start_date_precision text,
  ADD COLUMN end_date_precision text,
  ADD CONSTRAINT work_start_precision_valid CHECK (
    start_date_precision IS NULL OR (start_date IS NOT NULL AND
      ((start_date_precision = 'year' AND EXTRACT(MONTH FROM start_date) = 1 AND EXTRACT(DAY FROM start_date) = 1)
       OR (start_date_precision = 'month' AND EXTRACT(DAY FROM start_date) = 1)
       OR start_date_precision = 'day'))),
  ADD CONSTRAINT work_end_precision_valid CHECK (
    end_date_precision IS NULL OR (end_date IS NOT NULL AND
      ((end_date_precision = 'year' AND EXTRACT(MONTH FROM end_date) = 1 AND EXTRACT(DAY FROM end_date) = 1)
       OR (end_date_precision = 'month' AND EXTRACT(DAY FROM end_date) = 1)
       OR end_date_precision = 'day')));
ALTER TABLE public.profile_certifications
  ADD COLUMN issue_date_precision text,
  ADD COLUMN expiry_date_precision text,
  ADD CONSTRAINT cert_issue_precision_valid CHECK (
    issue_date_precision IS NULL OR (issue_date IS NOT NULL AND
      ((issue_date_precision = 'year' AND EXTRACT(MONTH FROM issue_date) = 1 AND EXTRACT(DAY FROM issue_date) = 1)
       OR (issue_date_precision = 'month' AND EXTRACT(DAY FROM issue_date) = 1)
       OR issue_date_precision = 'day'))),
  ADD CONSTRAINT cert_expiry_precision_valid CHECK (
    expiry_date_precision IS NULL OR (expiry_date IS NOT NULL AND
      ((expiry_date_precision = 'year' AND EXTRACT(MONTH FROM expiry_date) = 1 AND EXTRACT(DAY FROM expiry_date) = 1)
       OR (expiry_date_precision = 'month' AND EXTRACT(DAY FROM expiry_date) = 1)
       OR expiry_date_precision = 'day')));
COMMENT ON COLUMN public.profile_work_experience.start_date_precision IS 'year/month/day: supplied precision; NULL with date: legacy precision unknown. Do not backfill.';
COMMENT ON COLUMN public.profile_work_experience.end_date_precision IS 'Supplied precision only; independent of current/unknown employment status.';
COMMENT ON COLUMN public.profile_certifications.issue_date_precision IS 'Supplied precision; NULL with date retains legacy uncertainty.';
COMMENT ON COLUMN public.profile_certifications.expiry_date_precision IS 'Supplied precision; NULL with date retains legacy uncertainty.';

-- Preserve the existing invoker, ownership/RLS, parent row lock, conflict handling,
-- child identity and single transaction. Only date compatibility is added.
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
  v_row        jsonb;
  v_old_row    jsonb;
  v_checked    jsonb;
  v_date_key   text;
  v_precision_key text;
  v_date_keys  text[];
  v_new_date   text;
  v_old_date   text;
  v_precision text;
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

      -- Resolve every date/precision pair per row before collection-wide key
      -- union. Otherwise a new-client sibling could erase an old client's
      -- omitted precision through jsonb_populate_recordset's NULL defaults.
      IF v_pair.json_key IN ('work_experience', 'certifications') THEN
        v_date_keys := CASE WHEN v_pair.json_key = 'work_experience'
          THEN ARRAY['start_date', 'end_date'] ELSE ARRAY['issue_date', 'expiry_date'] END;
        v_checked := '[]'::jsonb;
        FOR v_row IN SELECT value FROM jsonb_array_elements(v_rows) LOOP
          v_old_row := NULL;
          IF nullif(v_row->>'id', '') IS NOT NULL THEN
            EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id = $1 AND profile_id = $2 FOR UPDATE', v_pair.table_name)
              USING (v_row->>'id')::uuid, v_pid INTO v_old_row;
          END IF;
          FOREACH v_date_key IN ARRAY v_date_keys LOOP
            v_precision_key := v_date_key || '_precision';
            v_old_date := v_old_row->>v_date_key;
            v_new_date := CASE WHEN v_row ? v_date_key
              THEN nullif(v_row->>v_date_key, '') ELSE v_old_date END;
            v_precision := v_row->>v_precision_key;
            IF v_precision IS NOT NULL AND v_precision NOT IN ('year', 'month', 'day') THEN
              RAISE EXCEPTION 'Invalid date precision. Refresh the profile editor and try again.' USING ERRCODE = '22023';
            END IF;
            IF v_new_date IS NULL THEN
              IF v_precision IS NOT NULL THEN
                RAISE EXCEPTION 'Date precision requires a date.' USING ERRCODE = '22023';
              END IF;
              v_row := v_row || jsonb_build_object(v_date_key, NULL, v_precision_key, NULL);
            ELSE
              IF v_new_date !~ '^\d{4}-\d{2}-\d{2}$' OR (v_new_date::date)::text IS DISTINCT FROM v_new_date THEN
                RAISE EXCEPTION 'A canonical calendar date is required.' USING ERRCODE = '22023';
              END IF;
              -- Old/precision-unknown clients may retain a date verbatim, but
              -- cannot add/change a dated fact without supplying precision.
              IF v_precision IS NULL THEN
                IF v_old_row IS NULL OR v_new_date IS DISTINCT FROM v_old_date THEN
                  RAISE EXCEPTION 'Date precision is required for a new or changed date. Refresh the profile editor and try again.' USING ERRCODE = 'P9601';
                END IF;
                v_precision := v_old_row->>v_precision_key;
              END IF;
              v_row := v_row || jsonb_build_object(v_date_key, v_new_date, v_precision_key, v_precision);
            END IF;
          END LOOP;
          v_checked := v_checked || jsonb_build_array(v_row);
        END LOOP;
        v_rows := v_checked;
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
