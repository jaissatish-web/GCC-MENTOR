begin;

alter table public.voice_interview_answers
  add column audio_delete_after timestamptz,
  add column audio_deleted_at timestamptz;

-- Existing audio receives the same 72-hour lifetime measured from save time
-- (or session creation for prepared but unsaved uploads). Old objects become
-- eligible on the next worker run rather than being retained indefinitely.
update public.voice_interview_answers a
set audio_delete_after = coalesce(a.saved_at, s.created_at) + interval '3 days'
from public.voice_interview_sessions s
where s.id = a.session_id;

alter table public.voice_interview_answers
  alter column audio_delete_after set default (now() + interval '3 days'),
  alter column audio_delete_after set not null;

create index voice_answers_audio_expiry
  on public.voice_interview_answers(audio_delete_after)
  where audio_deleted_at is null;

commit;
