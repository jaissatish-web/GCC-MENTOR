-- Migration 041 — versioned prompts, draft then publish.
--
-- Founder decision 2026-08-17: prompts are edited and optimised from /admin,
-- with versions and testing, because prompt quality IS product quality here.
-- Chosen from two options: draft-then-publish rather than edit-goes-live.
--
-- WHAT WAS THERE BEFORE. `prompt_templates` (migration 025) stores one row per
-- key and is edited in place: no version, no history, no rollback. It is also
-- entirely inert — `LIVE_PROMPT_TEMPLATE_KEYS` is an empty array, so no AI call
-- reads it. That table is left in place (never drop without an explicit
-- instruction) but is superseded by this one and should not gain new keys.
--
-- WHY VERSIONS RATHER THAN A TEXT FIELD. The reason is attribution, not tidiness.
-- Every generation records WHICH VERSION produced it, so when output quality
-- moves it can be traced to the prompt, the model, or the input. Without that,
-- prompt tuning is done from memory and the wrong conclusion gets drawn at least
-- once. That is also why nothing here is ever updated in place or deleted: a
-- version referenced by an old usage row must still be readable.
--
-- WHAT IS DELIBERATELY NOT STORED HERE. Only the editable part of a prompt: the
-- persona, tone, task instructions, emphasis and examples. The grounding block
-- and the output schema are NOT in this table and must never be put in it. They
-- are injected in code by lib/ai/runTask.ts from a constant. A bad edit to the
-- grounding block would silently turn off the product's one promise with nothing
-- downstream to catch it; a bad edit to the schema would break every call for
-- every user. Editing must be able to change quality, never safety.

create table if not exists public.prompt_versions (
  id           uuid primary key default gen_random_uuid(),
  prompt_key   text not null,
  version      integer not null check (version > 0),
  -- The editable body only. See the note above on what must never live here.
  body         text not null,
  status       text not null check (status in ('draft', 'active', 'archived')),
  -- Why this version exists, in the author's own words. Shown in the picker.
  notes        text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  unique (prompt_key, version)
);

-- EXACTLY ONE ACTIVE VERSION PER PROMPT, ENFORCED BY THE DATABASE.
--
-- A partial unique index, the same technique the one-free-resume quota uses
-- (migration 038). Publishing is "archive the current active, then activate the
-- new one", and if those two steps ever race or a code path forgets the first,
-- the second fails loudly here instead of leaving two active versions and a
-- silent coin-flip over which prompt a user gets.
create unique index if not exists prompt_versions_one_active_per_key
  on public.prompt_versions (prompt_key)
  where status = 'active';

-- The reader looks up by key and status on every generation.
create index if not exists prompt_versions_key_status_idx
  on public.prompt_versions (prompt_key, status);

comment on table public.prompt_versions is
  'Versioned, admin-editable prompt bodies. One active version per key, enforced by a partial unique index. The grounding block and output schema are NOT here - they are injected in code and are not editable.';

-- ---------------------------------------------------------------------------
-- Attribution: which prompt version produced this generation.
-- ---------------------------------------------------------------------------
--
-- Nullable on purpose, and it will stay null for a while: a service that has no
-- stored prompt version runs on its in-code prompt, which is the correct state
-- until each service is migrated. Null means "in-code prompt", not "unknown".
alter table public.ai_usage_log
  add column if not exists prompt_version_id uuid references public.prompt_versions(id) on delete set null;

comment on column public.ai_usage_log.prompt_version_id is
  'Which prompt version produced this call. NULL = the service ran on its in-code prompt.';

-- ---------------------------------------------------------------------------
-- Privileges.
-- ---------------------------------------------------------------------------
--
-- Service-role only, with NO policy for anon or authenticated at all — the same
-- lockdown as ai_provider_config and prompt_templates. A user who could write
-- this table could rewrite the instructions the product runs on, for everyone.
-- No policy is tighter than an owner-only policy, not looser.
alter table public.prompt_versions enable row level security;

create policy prompt_versions_service_all on public.prompt_versions
  for all to service_role using (true) with check (true);

-- THIS PROJECT GRANTS TO anon AND authenticated BY DEFAULT, and a
-- REVOKE ... FROM PUBLIC never touches those. Found the hard way twice: once on
-- SECURITY DEFINER functions that were live and exploitable, and once on
-- TRUNCATE across all 12 tables (migration 040). So revoke explicitly, by name,
-- and read the grants back from the catalogue afterwards rather than trusting
-- this statement did what it looks like it does.
revoke all on public.prompt_versions from anon, authenticated;
