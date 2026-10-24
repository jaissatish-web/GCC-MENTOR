-- REVIEW-DEFER-001: distinguish a deferred current/end question from current work.
-- false preserves legacy rows; new imported unknowns explicitly submit true.
ALTER TABLE public.profile_work_experience
  ADD COLUMN end_date_unconfirmed boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profile_work_experience.end_date_unconfirmed IS
  'When true and end_date is NULL, employment end/current status is unknown. Do not infer Present.';
