-- REVIEW-DEFER-001: retain an imported role when its start date is unknown.
-- No existing facts, grants, ownership policies or save functions are changed.
ALTER TABLE public.profile_work_experience
  ALTER COLUMN start_date DROP NOT NULL;
COMMENT ON COLUMN public.profile_work_experience.start_date IS
  'Recorded start date; NULL means not yet supplied. Never substitute a guessed date.';
