-- Additive metadata on existing owner-scoped rows. No data rewrite or new grants.
ALTER TABLE public.profile_additional_information
  ADD COLUMN category_id uuid,
  ADD COLUMN category_name text CHECK (category_name IS NULL OR char_length(category_name) BETWEEN 1 AND 80),
  ADD COLUMN category_order integer DEFAULT 0 CHECK (category_order BETWEEN 0 AND 200),
  ADD COLUMN category_position text DEFAULT 'end' CHECK (category_position IN ('after_summary','after_experience','after_education','after_skills','after_certifications','end')),
  ADD COLUMN level text CHECK (level IS NULL OR char_length(level) <= 100),
  ADD COLUMN show_on_resume boolean DEFAULT true;
-- save_career_profile dynamically uses supplied real columns. Existing ownership
-- RLS, authenticated grants and parent hard-delete cascade continue to apply.
NOTIFY pgrst, 'reload schema';
