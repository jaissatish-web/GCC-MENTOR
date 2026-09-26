-- Branch-only rollout: apply to an isolated test project first. No production data is rewritten.
begin;
create table public.voice_interview_sessions (
  id uuid primary key,
  package_id uuid not null references public.packages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  run_snapshot jsonb not null,
  profile_snapshot jsonb not null,
  resume_fingerprint text not null,
  rubric_version text not null,
  status text not null default 'recording' check (status in ('recording','queued','processing','failed','completed','deleting')),
  lease_token uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  last_error text,
  report jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index voice_sessions_owner_package on public.voice_interview_sessions(user_id,package_id,created_at desc);
create index voice_sessions_queue on public.voice_interview_sessions(status,lease_until) where status in ('queued','processing');
alter table public.voice_interview_sessions enable row level security;
revoke all on public.voice_interview_sessions from public,anon,authenticated;
grant select on public.voice_interview_sessions to authenticated;
grant all on public.voice_interview_sessions to service_role;
create policy voice_sessions_read on public.voice_interview_sessions for select to authenticated using ((select auth.uid())=user_id);

create table public.voice_interview_answers (
  session_id uuid not null references public.voice_interview_sessions(id) on delete cascade,
  question_id uuid not null,
  audio_path text not null unique,
  mime_type text not null check(mime_type in ('audio/webm','audio/mp4','audio/ogg')),
  saved_at timestamptz,
  duration_seconds numeric,
  byte_size integer check(byte_size is null or byte_size between 1 and 8388608),
  transcript text,
  delivery jsonb,
  feedback jsonb,
  primary key(session_id,question_id)
);
alter table public.voice_interview_answers enable row level security;
revoke all on public.voice_interview_answers from public,anon,authenticated;
grant select on public.voice_interview_answers to authenticated;
grant all on public.voice_interview_answers to service_role;
create policy voice_answers_read on public.voice_interview_answers for select to authenticated using (
  exists(select 1 from public.voice_interview_sessions s where s.id=session_id and s.user_id=(select auth.uid()))
);

-- Deleting a package/profile cascades the relational rows; queue their storage objects too.
create table public.voice_audio_cleanup (
  audio_path text primary key,
  delete_after timestamptz not null default (now()+interval '3 hours')
);
alter table public.voice_audio_cleanup enable row level security;
revoke all on public.voice_audio_cleanup from public,anon,authenticated;
grant all on public.voice_audio_cleanup to service_role;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create or replace function private.queue_voice_audio_cleanup()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.voice_audio_cleanup(audio_path) values(old.audio_path) on conflict do nothing;
  return old;
end; $$;
revoke all on function private.queue_voice_audio_cleanup() from public,anon,authenticated;
create trigger queue_voice_audio_cleanup before delete on public.voice_interview_answers
for each row execute function private.queue_voice_audio_cleanup();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mock-interview-audio','mock-interview-audio',false,8388608,array['audio/webm','audio/mp4','audio/ogg'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- No client INSERT/UPDATE/DELETE policy: uploads require an ownership-checked signed upload token.
-- Playback is issued by the owner-checked server route as a short-lived URL.

create or replace function public.voice_start_session(p_package_id uuid,p_user_id uuid,p_run jsonb,p_profile jsonb,p_fingerprint text,p_rubric text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.packages where id=p_package_id for update;
  if owner_id is distinct from p_user_id then return false; end if;
  if jsonb_array_length(p_run->'questions') not between 5 and 15 then raise exception 'Invalid question count'; end if;
  if (p_run->>'input_mode') is distinct from 'voice' then raise exception 'Invalid interview mode'; end if;
  insert into public.voice_interview_sessions(id,package_id,user_id,run_snapshot,profile_snapshot,resume_fingerprint,rubric_version)
  values((p_run->>'id')::uuid,p_package_id,p_user_id,p_run,p_profile,p_fingerprint,p_rubric);
  perform public.package_append_mock_run(p_package_id,p_user_id,p_run,jsonb_build_object('id',gen_random_uuid(),'type','mock_interview_started','label','Recorded voice interview started','at',now()));
  return true;
end; $$;

create or replace function public.voice_prepare_answer(p_session_id uuid,p_user_id uuid,p_question_id uuid,p_mime text,p_path text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare s public.voice_interview_sessions; a public.voice_interview_answers;
begin
  select * into s from public.voice_interview_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found or s.status<>'recording' then raise exception 'Interview is not accepting recordings'; end if;
  if not exists(select 1 from jsonb_array_elements(s.run_snapshot->'questions') q where q->>'id'=p_question_id::text) then raise exception 'Question not found'; end if;
  if split_part(p_path,'/',1)<>p_user_id::text or split_part(p_path,'/',2)<>p_session_id::text then raise exception 'Invalid path'; end if;
  insert into public.voice_interview_answers(session_id,question_id,audio_path,mime_type) values(p_session_id,p_question_id,p_path,p_mime) on conflict do nothing;
  select * into a from public.voice_interview_answers where session_id=p_session_id and question_id=p_question_id;
  return to_jsonb(a);
end; $$;

create or replace function public.voice_accept_answer(p_session_id uuid,p_user_id uuid,p_question_id uuid,p_bytes integer,p_seconds numeric)
returns boolean language plpgsql security invoker set search_path=public as $$
declare s public.voice_interview_sessions;
begin
  select * into s from public.voice_interview_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found or s.status<>'recording' then return false; end if;
  if p_seconds is null or p_seconds<0.5 or p_seconds>185 then raise exception 'Invalid duration'; end if;
  update public.voice_interview_answers set saved_at=coalesce(saved_at,now()),byte_size=p_bytes,duration_seconds=p_seconds
  where session_id=p_session_id and question_id=p_question_id and saved_at is null;
  return exists(select 1 from public.voice_interview_answers where session_id=p_session_id and question_id=p_question_id and saved_at is not null);
end; $$;

create or replace function public.voice_request_review(p_session_id uuid,p_user_id uuid)
returns text language plpgsql security invoker set search_path=public as $$
declare s public.voice_interview_sessions; n integer;
begin
  select * into s from public.voice_interview_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found then raise exception 'Interview not found'; end if;
  if s.status='deleting' then raise exception 'Interview was deleted'; end if;
  if s.status='processing' and s.attempts>=5 and s.lease_until<now() then s.status:='failed'; end if;
  if s.status in ('queued','processing','completed') then return s.status; end if;
  select count(*) into n from public.voice_interview_answers where session_id=p_session_id and saved_at is not null;
  if n<>jsonb_array_length(s.run_snapshot->'questions') then raise exception 'Save every answer before requesting review'; end if;
  update public.voice_interview_sessions set status='queued',last_error=null,attempts=0,lease_token=null,lease_until=null where id=p_session_id;
  return 'queued';
end; $$;

create or replace function public.voice_claim_review(p_user_id uuid default null,p_session_id uuid default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare s public.voice_interview_sessions;
begin
  select * into s from public.voice_interview_sessions
  where status in ('queued','processing') and (lease_until is null or lease_until<now()) and attempts<5
    and (p_user_id is null or user_id=p_user_id) and (p_session_id is null or id=p_session_id)
  order by created_at for update skip locked limit 1;
  if not found then return null; end if;
  update public.voice_interview_sessions set status='processing',lease_token=gen_random_uuid(),lease_until=now()+interval '240 seconds',attempts=attempts+1
  where id=s.id returning * into s;
  return to_jsonb(s);
end; $$;

create or replace function public.voice_mark_deleting(p_session_id uuid,p_user_id uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
declare s public.voice_interview_sessions;
begin
  select * into s from public.voice_interview_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found then raise exception 'Interview not found'; end if;
  if s.lease_until>now() then raise exception 'Review is running'; end if;
  update public.voice_interview_sessions set status='deleting',completed_at=case when status='deleting' then completed_at else now() end,profile_snapshot='{}',report=null,last_error=null,lease_token=null,lease_until=null where id=p_session_id;
  update public.voice_interview_answers set transcript=null,delivery=null,feedback=null where session_id=p_session_id;
  update public.packages set mock_interview_runs=coalesce((select array_agg(r) from unnest(coalesce(mock_interview_runs,'{}'::jsonb[])) r where r->>'id'<>p_session_id::text),'{}'::jsonb[]) where id=s.package_id and user_id=p_user_id;
  return true;
end; $$;

create or replace function public.voice_delete_session(p_session_id uuid,p_user_id uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
declare s public.voice_interview_sessions;
begin
  select * into s from public.voice_interview_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found then return false; end if;
  if s.lease_until>now() then raise exception 'Review is running. Try deleting later.'; end if;
  update public.packages set mock_interview_runs=coalesce((select array_agg(r) from unnest(coalesce(mock_interview_runs,'{}'::jsonb[])) r where r->>'id'<>p_session_id::text),'{}'::jsonb[])
  where id=s.package_id and user_id=p_user_id;
  delete from public.voice_interview_sessions where id=p_session_id;
  return true;
end; $$;

revoke all on function public.voice_start_session(uuid,uuid,jsonb,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.voice_prepare_answer(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.voice_accept_answer(uuid,uuid,uuid,integer,numeric) from public,anon,authenticated;
revoke all on function public.voice_request_review(uuid,uuid) from public,anon,authenticated;
revoke all on function public.voice_claim_review(uuid,uuid) from public,anon,authenticated;
revoke all on function public.voice_delete_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.voice_start_session(uuid,uuid,jsonb,jsonb,text,text) to service_role;
grant execute on function public.voice_prepare_answer(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.voice_accept_answer(uuid,uuid,uuid,integer,numeric) to service_role;
grant execute on function public.voice_request_review(uuid,uuid) to service_role;
grant execute on function public.voice_claim_review(uuid,uuid) to service_role;
grant execute on function public.voice_delete_session(uuid,uuid) to service_role;

insert into public.ai_service_controls(action,service_key,enabled,daily_limit_per_user,max_concurrent_per_user)
values('mock_interview_transcription','mock_interview',true,150,1) on conflict(action) do nothing;
revoke all on function public.voice_mark_deleting(uuid,uuid) from public,anon,authenticated;
grant execute on function public.voice_mark_deleting(uuid,uuid) to service_role;
commit;
