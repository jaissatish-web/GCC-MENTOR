alter table public.referral_attributions add column profile_confirmed_version timestamptz;

-- Durable duplicate detection without retaining raw email in referral rows.
create table public.referral_reward_identities (
  identity_digest text primary key check (identity_digest ~ '^[0-9a-f]{64}$'),
  awarded_at timestamptz not null default statement_timestamp()
);
alter table public.referral_reward_identities enable row level security;
revoke all on public.referral_reward_identities from public, anon, authenticated, service_role;

create table public.monetization_admin_audit (
  id uuid primary key,
  admin_id uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default statement_timestamp()
);
alter table public.monetization_admin_audit enable row level security;
revoke all on public.monetization_admin_audit from public, anon, authenticated, service_role;
grant select on public.monetization_admin_audit to service_role;

create function public.require_monetization_admin(p_admin uuid, p_reason text)
returns void language plpgsql set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where user_id = p_admin and is_admin) then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'A reason of 1 to 500 characters is required' using errcode = '22023';
  end if;
end;
$$;

-- Confirmation makes a statement about a particular saved profile version.
-- Later edits or retries cannot issue a second award.
create function public.qualify_referral(p_referred uuid, p_assessed_profile_version timestamptz, p_review_approved boolean default false)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_attribution public.referral_attributions;
  v_config public.referral_program_settings;
  v_profile public.career_profiles;
  v_email text;
  v_referrer_email text;
  v_digest text;
  v_count integer;
begin
  select * into v_attribution from public.referral_attributions where referred_id = p_referred for update;
  if not found then return 'unattributed'; end if;
  if v_attribution.status in ('qualified', 'rejected') then return v_attribution.status; end if;
  select * into v_config from public.referral_program_settings where singleton;
  if not v_config.enabled then return 'paused'; end if;
  select email into v_email from auth.users where id = p_referred and email_confirmed_at is not null;
  if v_email is null then return 'pending_verification'; end if;
  select * into v_profile from public.career_profiles where user_id = p_referred for share;
  if v_profile.id is null or v_profile.updated_at is distinct from p_assessed_profile_version
    or length(btrim(coalesce(v_profile.full_name, ''))) < 2
    or not (
      exists (select 1 from public.profile_work_experience where profile_id = v_profile.id and length(btrim(role)) >= 2)
      or exists (select 1 from public.profile_education where profile_id = v_profile.id and length(btrim(degree)) >= 2 and length(btrim(institution)) >= 2)
      or exists (select 1 from public.profile_skills where profile_id = v_profile.id and length(btrim(name)) >= 2)
    ) then
    return 'incomplete_profile';
  end if;

  -- Serialize all qualification and review decisions for the same referrer.
  perform pg_advisory_xact_lock(hashtextextended(v_attribution.referrer_id::text, 743));
  select email into v_referrer_email from auth.users where id = v_attribution.referrer_id;
  v_digest := public.referral_email_digest(v_email);
  if v_digest = public.referral_email_digest(v_referrer_email)
    or exists (select 1 from public.referral_reward_identities where identity_digest = v_digest) then
    update public.referral_attributions set status = 'rejected', reason_code = 'duplicate_eligibility'
      where id = v_attribution.id;
    return 'rejected';
  end if;

  if p_review_approved and v_attribution.profile_confirmed_version is distinct from p_assessed_profile_version then
    return 'incomplete_profile';
  end if;
  update public.referral_attributions set profile_confirmed_at = statement_timestamp(),
    profile_confirmed_version = p_assessed_profile_version where id = v_attribution.id;
  if v_config.issuance_paused or exists (select 1 from public.referral_links
    where owner_id = v_attribution.referrer_id and suspended_at is not null) then
    update public.referral_attributions set status = 'pending_qualification', reason_code = 'issuance_paused'
      where id = v_attribution.id;
    return 'pending_qualification';
  end if;

  select count(*) into v_count from public.referral_attributions
    where referrer_id = v_attribution.referrer_id and qualified_at >= statement_timestamp() - interval '1 day';
  if not p_review_approved and (
    v_attribution.status = 'under_review' or v_count >= v_config.daily_reward_review_threshold
      or lower(split_part(v_email, '@', 2)) in ('mailinator.com', 'guerrillamail.com', '10minutemail.com', 'yopmail.com')
  ) then
    update public.referral_attributions set status = 'under_review', reason_code = 'eligibility_review'
      where id = v_attribution.id;
    return 'under_review';
  end if;
  insert into public.referral_reward_identities(identity_digest) values (v_digest) on conflict do nothing;
  if not found then
    update public.referral_attributions set status = 'rejected', reason_code = 'duplicate_eligibility'
      where id = v_attribution.id;
    return 'rejected';
  end if;
  perform public.grant_wallet_credits(v_attribution.referrer_id, 'referral', v_attribution.id, v_config.reward_units);
  update public.referral_attributions set status = 'qualified', reason_code = null, qualified_at = statement_timestamp()
    where id = v_attribution.id;
  return 'qualified';
end;
$$;

create function public.admin_grant_complimentary_service(
  p_admin uuid, p_user uuid, p_service text, p_quantity integer, p_reason text, p_operation uuid
) returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_key text;
  v_previous bigint;
  v_audit public.monetization_admin_audit;
begin
  perform public.require_monetization_admin(p_admin, p_reason);
  if p_quantity is null or p_quantity not between 1 and 50 then
    raise exception 'Complimentary uses must be between 1 and 50' using errcode = '22023';
  end if;
  select case service when 'optimization' then 'resume_optimization' else service end into strict v_key
    from public.credit_service_prices where service = p_service;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 742));
  select * into v_audit from public.monetization_admin_audit where id = p_operation;
  if found then
    if v_audit.admin_id is distinct from p_admin or v_audit.user_id is distinct from p_user
      or v_audit.action <> 'complimentary_service' or v_audit.after_state ->> 'service' <> p_service
      or (v_audit.after_state ->> 'granted')::integer <> p_quantity or v_audit.reason <> btrim(p_reason) then
      raise exception 'Admin operation reference already used' using errcode = '23505';
    end if;
    return p_quantity;
  end if;
  select count(*) into v_previous from public.user_service_credits
    where user_id = p_user and service_key = v_key and consumed_at is null;
  insert into public.user_service_credits(user_id, service_key, source, granted_by, reason)
    select p_user, v_key, 'admin_grant', p_admin, btrim(p_reason) from generate_series(1, p_quantity);
  insert into public.monetization_admin_audit(id, admin_id, user_id, action, reason, before_state, after_state)
    values (p_operation, p_admin, p_user, 'complimentary_service', btrim(p_reason),
      jsonb_build_object('available_rows', v_previous), jsonb_build_object('available_rows', v_previous + p_quantity,
        'service', p_service, 'granted', p_quantity));
  return p_quantity;
end;
$$;

revoke all on function public.require_monetization_admin(uuid, text),
  public.qualify_referral(uuid, timestamptz, boolean),
  public.admin_grant_complimentary_service(uuid, uuid, text, integer, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.qualify_referral(uuid, timestamptz, boolean),
  public.admin_grant_complimentary_service(uuid, uuid, text, integer, text, uuid) to service_role;
