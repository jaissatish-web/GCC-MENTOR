-- Latest import comparison only. Private resume text, never public/shared.
CREATE TABLE public.resume_import_reviews (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  review jsonb NOT NULL CHECK (jsonb_typeof(review) = 'object' AND review->>'version' = '1'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.resume_import_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.resume_import_reviews FROM anon, authenticated;
GRANT SELECT, DELETE ON public.resume_import_reviews TO authenticated;
GRANT ALL ON public.resume_import_reviews TO service_role;
CREATE POLICY import_review_owner_read ON public.resume_import_reviews FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY import_review_owner_delete ON public.resume_import_reviews FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
-- Inserts and updates come only from the verified server import pipeline.
