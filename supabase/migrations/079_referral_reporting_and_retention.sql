-- Browser identifiers stay on recent visits. Lifetime visit counts survive
-- pruning, while unique-browser reach is reported only over the stated window.
alter table public.referral_links add column total_visits bigint not null default 0 check (total_visits >= 0);
update public.referral_links link set total_visits = (
  select count(*) from public.referral_visit_claims visit where visit.referrer_id = link.owner_id
);
create function public.count_referral_visit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.referral_links set total_visits = total_visits + 1 where owner_id = new.referrer_id;
  return new;
end;
$$;
create trigger count_referral_visit after insert on public.referral_visit_claims
  for each row execute function public.count_referral_visit();

create function public.referral_summary(p_owner uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'visits', coalesce((select total_visits from public.referral_links where owner_id = p_owner), 0),
    'unique_browsers_90d', (select count(distinct browser_id) from public.referral_visit_claims
      where referrer_id = p_owner and created_at > statement_timestamp() - interval '90 days'),
    'registrations', count(*),
    'pending_verification', count(*) filter (where status = 'pending_verification'),
    'incomplete_profile', count(*) filter (where status = 'incomplete_profile'),
    'pending_qualification', count(*) filter (where status = 'pending_qualification'),
    'under_review', count(*) filter (where status = 'under_review'),
    'qualified', count(*) filter (where status = 'qualified'),
    'rejected', count(*) filter (where status = 'rejected')
  )
  from public.referral_attributions where referrer_id = p_owner;
$$;

create function public.prune_referral_tracking()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.referral_signup_intents where expires_at < statement_timestamp();
  delete from public.referral_visit_claims where created_at < statement_timestamp() - interval '90 days'
    and expires_at <= statement_timestamp();
  delete from public.referral_reward_identities where awarded_at < statement_timestamp() - interval '365 days';
end;
$$;

revoke all on function public.count_referral_visit(), public.referral_summary(uuid), public.prune_referral_tracking()
  from public, anon, authenticated, service_role;
grant execute on function public.referral_summary(uuid), public.prune_referral_tracking() to service_role;

create function public.expire_wallet_credits(p_limit integer default 100)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_lot record;
  v_available integer;
  v_expired integer := 0;
begin
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid expiry batch'; end if;
  for v_lot in
    select l.id, l.owner_id from public.credit_lots l join public.credit_ledger e on e.lot_id = l.id
    where l.expires_at <= statement_timestamp()
    group by l.id
    having sum(e.available_delta) > 0
    order by l.owner_id, l.id limit p_limit
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_lot.owner_id::text, 742));
    select coalesce(sum(e.available_delta), 0) into v_available from public.credit_ledger e where e.lot_id = v_lot.id;
    if v_available > 0 then
      insert into public.credit_ledger(lot_id, kind, units) values (v_lot.id, 'expire', v_available);
      v_expired := v_expired + 1;
    end if;
  end loop;
  return v_expired;
end;
$$;
revoke all on function public.expire_wallet_credits(integer) from public, anon, authenticated, service_role;
grant execute on function public.expire_wallet_credits(integer) to service_role;
