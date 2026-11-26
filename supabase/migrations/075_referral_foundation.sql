-- Referral tracking is server-owned. No browser role can select identities
-- or write status. Client-facing summaries will use scoped projections.
create table public.referral_program_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  issuance_paused boolean not null default false,
  reward_units integer not null default 3 check (reward_units between 1 and 1000),
  attribution_days integer not null default 30 check (attribution_days between 1 and 90),
  hourly_visit_threshold integer not null default 60 check (hourly_visit_threshold between 1 and 10000),
  daily_reward_review_threshold integer not null default 10 check (daily_reward_review_threshold between 1 and 10000),
  qualification_policy_version integer not null default 1 check (qualification_policy_version = 1)
);

insert into public.referral_program_settings default values;

create table public.referral_identity_keys (
  singleton boolean primary key default true check (singleton),
  secret text not null default (gen_random_uuid()::text || gen_random_uuid()::text)
);
insert into public.referral_identity_keys default values;
alter table public.referral_identity_keys enable row level security;
revoke all on public.referral_identity_keys from public, anon, authenticated, service_role;

create function public.referral_email_digest(p_email text)
returns text language sql stable
set search_path = ''
as $$
  select encode(sha256(convert_to(secret || ':' || lower(btrim(p_email)), 'UTF8')), 'hex')
    from public.referral_identity_keys where singleton;
$$;
revoke all on function public.referral_email_digest(text) from public, anon, authenticated, service_role;

create table public.referral_links (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 24))
    check (code ~ '^[0-9A-F]{24}$'),
  created_at timestamptz not null default now(),
  suspended_at timestamptz
);

create table public.referral_visit_claims (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.referral_links(owner_id) on delete cascade,
  browser_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at)
);

create index referral_visit_claim_lookup
  on public.referral_visit_claims(referrer_id, browser_id, created_at desc);
create index referral_visit_claim_expiry on public.referral_visit_claims(expires_at);

create table public.referral_signup_intents (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.referral_visit_claims(id) on delete cascade,
  email_digest text not null check (email_digest ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default now() + interval '20 minutes',
  consumed_at timestamptz
);

create index referral_signup_intents_expiry on public.referral_signup_intents(expires_at);

create table public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referred_id uuid unique references auth.users(id) on delete set null,
  referrer_id uuid not null references public.referral_links(owner_id) on delete cascade,
  created_at timestamptz not null default now(),
  email_verified_at timestamptz,
  profile_confirmed_at timestamptz,
  qualified_at timestamptz,
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'incomplete_profile', 'pending_qualification', 'under_review', 'qualified', 'rejected')),
  reason_code text,
  check (referrer_id is distinct from referred_id),
  check ((status = 'qualified') = (qualified_at is not null))
);

create index referral_attributions_referrer_history
  on public.referral_attributions(referrer_id, created_at desc, id desc);
create index referral_attributions_status
  on public.referral_attributions(status, created_at, id);

alter table public.referral_program_settings enable row level security;
alter table public.referral_links enable row level security;
alter table public.referral_visit_claims enable row level security;
alter table public.referral_signup_intents enable row level security;
alter table public.referral_attributions enable row level security;

revoke all on public.referral_program_settings, public.referral_links, public.referral_visit_claims,
  public.referral_signup_intents, public.referral_attributions from public, anon, authenticated, service_role;
grant select on public.referral_program_settings, public.referral_links,
  public.referral_visit_claims, public.referral_attributions to service_role;

create function public.get_or_create_referral_link(p_user_id uuid)
returns public.referral_links
language plpgsql security definer
set search_path = ''
as $$
declare
  v_link public.referral_links;
begin
  select * into v_link from public.referral_links where owner_id = p_user_id;
  if found then return v_link; end if;
  if not exists (select 1 from public.referral_program_settings where enabled) then
    return null;
  end if;
  -- A uniqueness collision on the short public code retries with fresh entropy.
  loop
    insert into public.referral_links(owner_id) values (p_user_id)
      on conflict do nothing returning * into v_link;
    if found then return v_link; end if;
    select * into v_link from public.referral_links where owner_id = p_user_id;
    if found then return v_link; end if;
  end loop;
end;
$$;

create function public.record_referral_visit(p_code text, p_browser_id uuid, p_existing_claim uuid default null)
returns table (claim_id uuid, claim_expires_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_config public.referral_program_settings;
  v_owner uuid;
  v_claim public.referral_visit_claims;
begin
  select * into v_config from public.referral_program_settings where enabled;
  if not found then return; end if;
  select owner_id into v_owner from public.referral_links
    where code = upper(p_code) and suspended_at is null;
  if not found then return; end if;

  -- Serialize the per-browser rate check and insert. "Unique" counts
  -- browser IDs instead of attributing an identity to a network.
  perform pg_advisory_xact_lock(hashtextextended(p_browser_id::text, 741));
  if (select count(*) from public.referral_visit_claims
      where browser_id = p_browser_id and created_at > statement_timestamp() - interval '1 hour')
    < v_config.hourly_visit_threshold then
    insert into public.referral_visit_claims(referrer_id, browser_id, expires_at)
      values (v_owner, p_browser_id, statement_timestamp() + make_interval(days => v_config.attribution_days))
      returning * into v_claim;
  end if;

  return query
    select c.id, c.expires_at from public.referral_visit_claims c
    join public.referral_links l on l.owner_id = c.referrer_id and l.suspended_at is null
    where c.browser_id = p_browser_id and c.expires_at > statement_timestamp()
      and (c.id = p_existing_claim or c.id = v_claim.id)
    order by (c.id = p_existing_claim) desc nulls last, c.created_at, c.id
    limit 1;
end;
$$;

create index referral_visit_claim_rate on public.referral_visit_claims(browser_id, created_at desc);

create function public.create_referral_signup_intent(p_claim_id uuid, p_browser_id uuid, p_email text)
returns uuid
language sql security definer
set search_path = ''
as $$
  insert into public.referral_signup_intents(visit_id, email_digest)
  select c.id, public.referral_email_digest(p_email)
    from public.referral_visit_claims c
    join public.referral_links l on l.owner_id = c.referrer_id and l.suspended_at is null
    where c.id = p_claim_id and c.browser_id = p_browser_id and c.expires_at > statement_timestamp()
      and exists (select 1 from public.referral_program_settings where enabled)
  returning id;
$$;

-- Supabase only calls INSERT for a new auth account. Copy the verified claim
-- there, independent of browser cookies after signup and of email link type.
create function public.capture_new_account_referral()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_intent text := new.raw_user_meta_data ->> 'referral_signup_intent';
  v_referrer uuid;
begin
  if v_intent is null or v_intent !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    or new.email is null then
    return new;
  end if;
  select l.owner_id into v_referrer
    from public.referral_signup_intents i
    join public.referral_visit_claims c on c.id = i.visit_id and c.expires_at > statement_timestamp()
    join public.referral_links l on l.owner_id = c.referrer_id and l.suspended_at is null
    where i.id = v_intent::uuid and i.expires_at > statement_timestamp() and i.consumed_at is null
      and i.email_digest = public.referral_email_digest(new.email)
      and exists (select 1 from public.referral_program_settings where enabled)
    for update of i;
  if v_referrer is null or v_referrer = new.id then return new; end if;

  update public.referral_signup_intents set consumed_at = statement_timestamp() where id = v_intent::uuid;
  insert into public.referral_attributions(referrer_id, referred_id, email_verified_at, status)
    values (v_referrer, new.id, new.email_confirmed_at,
      case when new.email_confirmed_at is null then 'pending_verification' else 'incomplete_profile' end)
    on conflict (referred_id) do nothing;
  return new;
end;
$$;

create trigger capture_new_account_referral
  after insert on auth.users for each row execute function public.capture_new_account_referral();

revoke all on function public.get_or_create_referral_link(uuid),
  public.record_referral_visit(text, uuid, uuid),
  public.create_referral_signup_intent(uuid, uuid, text),
  public.capture_new_account_referral() from public, anon, authenticated, service_role;
grant execute on function public.get_or_create_referral_link(uuid),
  public.record_referral_visit(text, uuid, uuid),
  public.create_referral_signup_intent(uuid, uuid, text) to service_role;


create function public.capture_referral_email_confirmation()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  update public.referral_attributions
     set email_verified_at = new.email_confirmed_at, status = 'incomplete_profile'
   where referred_id = new.id and status = 'pending_verification';
  return new;
end;
$$;
revoke all on function public.capture_referral_email_confirmation() from public, anon, authenticated, service_role;
create trigger capture_referral_email_confirmation
  after update of email_confirmed_at on auth.users for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.capture_referral_email_confirmation();
