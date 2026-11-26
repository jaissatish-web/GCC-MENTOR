alter table public.credit_wallet_settings add column pricing_visible boolean not null default false;

create function public.admin_find_monetization_user(p_admin uuid, p_email text)
returns table(user_id uuid, email text, signup_date timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_monetization_admin(p_admin, 'Find account');
  return query select u.id, u.email::text, u.created_at
    from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1;
end;
$$;

create function public.admin_monetization_action(
  p_admin uuid, p_operation uuid, p_action text, p_subject uuid, p_reason text, p_details jsonb
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_before jsonb := '{}'::jsonb;
  v_after jsonb;
  v_referral public.referral_attributions;
  v_lot public.credit_lots;
  v_admin_audit public.monetization_admin_audit;
  v_target uuid := p_subject;
  v_available bigint;
  v_units integer;
  v_status text;
begin
  perform public.require_monetization_admin(p_admin, p_reason);
  perform pg_advisory_xact_lock(hashtextextended(p_operation::text, 744));
  select * into v_admin_audit from public.monetization_admin_audit where id = p_operation;
  if found then
    if v_admin_audit.admin_id is distinct from p_admin or v_admin_audit.action is distinct from p_action
      or v_admin_audit.reason is distinct from btrim(p_reason)
      or v_admin_audit.after_state -> 'request' is distinct from p_details
      or v_admin_audit.after_state ->> 'subject' is distinct from p_subject::text then
      raise exception 'Admin operation reference already used' using errcode = '23505';
    end if;
    return v_admin_audit.after_state -> 'result';
  end if;

  case p_action
    when 'configure_referrals' then
      select to_jsonb(s) into strict v_before from public.referral_program_settings s where singleton for update;
      update public.referral_program_settings
        set enabled = (p_details ->> 'enabled')::boolean,
          issuance_paused = (p_details ->> 'issuance_paused')::boolean,
          reward_units = (p_details ->> 'reward_units')::integer,
          attribution_days = (p_details ->> 'attribution_days')::integer,
          hourly_visit_threshold = (p_details ->> 'hourly_visit_threshold')::integer,
          daily_reward_review_threshold = (p_details ->> 'daily_reward_review_threshold')::integer
        where singleton returning to_jsonb(referral_program_settings) into v_after;

    when 'configure_wallet' then
      perform 1 from public.credit_wallet_settings where singleton for update;
      select jsonb_build_object('settings', (select to_jsonb(s) from public.credit_wallet_settings s where singleton),
        'prices', (select jsonb_object_agg(service, units) from public.credit_service_prices)) into v_before;
      update public.credit_wallet_settings set enforcement_enabled = (p_details ->> 'enforcement_enabled')::boolean,
        pricing_visible = (p_details ->> 'pricing_visible')::boolean where singleton;
      update public.credit_service_prices set units = (p_details -> 'prices' ->> service)::integer;
      select jsonb_build_object('settings', (select to_jsonb(s) from public.credit_wallet_settings s where singleton),
        'prices', (select jsonb_object_agg(service, units) from public.credit_service_prices)) into v_after;

    when 'suspend_link' then
      select jsonb_build_object('suspended', suspended_at is not null) into strict v_before
        from public.referral_links where owner_id = p_subject for update;
      update public.referral_links set suspended_at = case when (p_details ->> 'suspended')::boolean
        then coalesce(suspended_at, statement_timestamp()) else null end where owner_id = p_subject;
      v_after := jsonb_build_object('suspended', (p_details ->> 'suspended')::boolean);

    when 'review_referral' then
      select * into strict v_referral from public.referral_attributions where id = p_subject for update;
      if v_referral.status not in ('under_review', 'pending_qualification')
        or v_referral.referred_id is null or v_referral.profile_confirmed_at is null then
        raise exception 'Referral is not eligible for this review' using errcode = '22023';
      end if;
      v_target := v_referral.referred_id;
      v_before := jsonb_build_object('status', v_referral.status);
      case p_details ->> 'decision'
        when 'reject' then
          update public.referral_attributions set status = 'rejected', reason_code = 'admin_review'
            where id = p_subject;
          v_status := 'rejected';
        when 'approve' then
          v_status := public.qualify_referral(v_target, (select updated_at from public.career_profiles
            where user_id = v_target), true);
        else raise exception 'Unknown review decision' using errcode = '22023';
      end case;
      v_after := jsonb_build_object('status', v_status);

    when 'grant_wallet' then
      if p_details ->> 'source' is null or p_details ->> 'source' not in ('admin_grant', 'promotion', 'correction') then
        raise exception 'Unsupported grant source' using errcode = '22023';
      end if;
      perform pg_advisory_xact_lock(hashtextextended(p_subject::text, 742));
      select jsonb_build_object('available', coalesce(sum(available), 0)) into v_before
        from public.wallet_source_summary(p_subject);
      v_after := jsonb_build_object('lot', public.grant_wallet_credits(p_subject, p_details ->> 'source',
        p_operation, (p_details ->> 'units')::integer, (p_details ->> 'expires_at')::timestamptz));
      v_after := v_after || jsonb_build_object('available', (select coalesce(sum(available), 0)
        from public.wallet_source_summary(p_subject)));

    when 'reverse_wallet' then
      select * into strict v_lot from public.credit_lots where id = p_subject;
      v_target := v_lot.owner_id;
      perform pg_advisory_xact_lock(hashtextextended(v_target::text, 742));
      select coalesce(sum(available_delta), 0) into v_available from public.credit_ledger where lot_id = p_subject;
      v_units := (p_details ->> 'units')::integer;
      if v_lot.expires_at <= clock_timestamp() or v_units is null or v_units < 1 or v_units > v_available then
        raise exception 'Requested reversal exceeds available balance' using errcode = '22023';
      end if;
      insert into public.credit_ledger(lot_id, kind, units) values (p_subject, 'reverse', v_units);
      v_before := jsonb_build_object('available', v_available);
      v_after := jsonb_build_object('available', v_available - v_units, 'reversed', v_units);

    else raise exception 'Unknown monetization action' using errcode = '22023';
  end case;

  insert into public.monetization_admin_audit(id, admin_id, user_id, action, reason, before_state, after_state)
    values (p_operation, p_admin, v_target, p_action, btrim(p_reason), v_before,
      jsonb_build_object('request', p_details, 'subject', p_subject, 'result', v_after));
  return v_after;
end;
$$;

create function public.admin_monetization_summary(p_admin uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_monetization_admin(p_admin, 'View referral summary');
  return jsonb_build_object(
    'links', (select count(*) from public.referral_links),
    'visits', (select coalesce(sum(total_visits), 0) from public.referral_links),
    'unique_browsers_90d', (select count(distinct browser_id) from public.referral_visit_claims
      where created_at > statement_timestamp() - interval '90 days'),
    'status_counts', coalesce((select jsonb_object_agg(status, count)
      from (select status, count(*) from public.referral_attributions group by status) counts), '{}'::jsonb),
    'credits_issued', (select coalesce(sum(units),0) from public.credit_ledger where kind = 'grant'),
    'credits_redeemed', (select coalesce(sum(units),0) from public.credit_ledger where kind = 'settle'),
    'credits_available', (select coalesce(sum(e.available_delta),0) from public.credit_ledger e
      join public.credit_lots l on l.id = e.lot_id
      where l.expires_at is null or l.expires_at > statement_timestamp()),
    'average_cost_per_credit_inr', (
      select case when count(*) > 0 then sum(estimated_cost_inr) / nullif(sum(sample.units), 0) end
      from public.ai_usage_log a
      join lateral (select units from public.credit_service_prices p where p.service =
        case when a.route = '/api/optimize' then 'optimization'
          when a.route like '%/cover-letter' then 'cover_letter'
          when a.route like '%/interview-qa' then 'interview_qa'
          when a.route like '%/mock-interview/start' then 'mock_interview_start' end) sample on true
      where a.created_at > statement_timestamp() - interval '30 days'
    ),
    'top_referrers', coalesce((select jsonb_agg(to_jsonb(top)) from (select referrer_id, count(*) qualified
      from public.referral_attributions where status = 'qualified'
      group by referrer_id order by qualified desc, referrer_id limit 10) top), '[]'::jsonb),
    'recent_registrations', coalesce((select jsonb_agg(to_jsonb(trend) order by day) from
      (select created_at::date as day, count(*) registrations, count(*) filter (where status = 'qualified') qualified
      from public.referral_attributions where created_at >= statement_timestamp() - interval '30 days'
      group by created_at::date) trend), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_find_monetization_user(uuid, text),
  public.admin_monetization_action(uuid, uuid, text, uuid, text, jsonb),
  public.admin_monetization_summary(uuid) from public, anon, authenticated, service_role;
grant execute on function public.admin_find_monetization_user(uuid, text),
  public.admin_monetization_action(uuid, uuid, text, uuid, text, jsonb),
  public.admin_monetization_summary(uuid) to service_role;
