-- Flexible service credits. The ledger is authoritative; available balance
-- is derived from events and lot expiry rather than stored on a user record.
create table public.credit_wallet_settings (
  singleton boolean primary key default true check (singleton),
  enforcement_enabled boolean not null default false
);
insert into public.credit_wallet_settings default values;

create table public.credit_service_prices (
  service text primary key check (service in ('optimization', 'cover_letter', 'interview_qa', 'mock_interview_start')),
  units integer not null check (units between 1 and 1000)
);
insert into public.credit_service_prices(service, units)
values ('optimization', 3), ('cover_letter', 1), ('interview_qa', 2), ('mock_interview_start', 3);

create table public.credit_lots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('referral', 'admin_grant', 'promotion', 'purchase', 'subscription', 'correction')),
  source_reference uuid not null,
  units integer not null check (units between 1 and 100000),
  issued_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz,
  unique (source, source_reference),
  check (expires_at is null or expires_at > issued_at)
);
create index credit_lots_owner_expiry on public.credit_lots(owner_id, expires_at, issued_at, id);

create table public.credit_service_reservations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  service text not null references public.credit_service_prices(service),
  operation_id uuid not null,
  request_identity text not null check (length(request_identity) between 1 and 160),
  units integer not null check (units between 1 and 1000),
  status text not null default 'reserved' check (status in ('reserved', 'settled', 'released')),
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  result_id uuid,
  service_credit_id uuid references public.user_service_credits(id) on delete set null,
  optimization_credit_id uuid references public.optimization_credits(id) on delete set null,
  unique (owner_id, service, operation_id),
  check (expires_at > created_at),
  check ((status = 'reserved') = (finished_at is null)),
  check ((status = 'settled') = (result_id is not null)),
  check (num_nonnulls(service_credit_id, optimization_credit_id) <= 1)
);
create unique index credit_hold_service_credit on public.credit_service_reservations(service_credit_id)
  where status = 'reserved' and service_credit_id is not null;
create unique index credit_hold_optimization_credit on public.credit_service_reservations(optimization_credit_id)
  where status = 'reserved' and optimization_credit_id is not null;
create index credit_reservation_stale on public.credit_service_reservations(expires_at) where status = 'reserved';

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  lot_id uuid not null references public.credit_lots(id) on delete cascade,
  reservation_id uuid references public.credit_service_reservations(id) on delete cascade,
  kind text not null check (kind in ('grant', 'reserve', 'settle', 'release', 'refund', 'expire', 'reverse')),
  units integer not null check (units between 1 and 100000),
  available_delta integer generated always as (
    case kind when 'grant' then units when 'release' then units when 'refund' then units when 'reserve' then -units
      when 'expire' then -units when 'reverse' then -units else 0 end
  ) stored,
  reserved_delta integer generated always as (
    case kind when 'reserve' then units when 'settle' then -units when 'release' then -units else 0 end
  ) stored,
  recorded_at timestamptz not null default statement_timestamp(),
  check ((reservation_id is not null) = (kind in ('reserve', 'settle', 'release', 'refund')))
);
create index credit_ledger_by_lot on public.credit_ledger(lot_id, id desc);
create unique index credit_ledger_reservation_kind on public.credit_ledger(reservation_id, lot_id, kind)
  where reservation_id is not null;
create unique index credit_ledger_lot_grant on public.credit_ledger(lot_id) where kind = 'grant';

alter table public.credit_wallet_settings enable row level security;
alter table public.credit_service_prices enable row level security;
alter table public.credit_lots enable row level security;
alter table public.credit_service_reservations enable row level security;
alter table public.credit_ledger enable row level security;
revoke all on public.credit_wallet_settings, public.credit_service_prices, public.credit_lots,
  public.credit_service_reservations, public.credit_ledger from public, anon, authenticated, service_role;
revoke all on sequence public.credit_ledger_id_seq from public, anon, authenticated, service_role;
grant select on public.credit_wallet_settings, public.credit_service_prices, public.credit_lots,
  public.credit_service_reservations, public.credit_ledger to service_role;

create function public.grant_wallet_credits(
  p_owner uuid, p_source text, p_reference uuid, p_units integer, p_expires_at timestamptz default null
) returns uuid language plpgsql security definer
set search_path = ''
as $$
declare
  v_lot public.credit_lots;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 742));
  insert into public.credit_lots(owner_id, source, source_reference, units, expires_at)
    values (p_owner, p_source, p_reference, p_units, p_expires_at)
    on conflict (source, source_reference) do nothing returning * into v_lot;
  if found then
    insert into public.credit_ledger(lot_id, kind, units) values (v_lot.id, 'grant', p_units);
  else
    select * into strict v_lot from public.credit_lots where source = p_source and source_reference = p_reference;
    if v_lot.owner_id <> p_owner or v_lot.units <> p_units or v_lot.expires_at is distinct from p_expires_at then
      raise exception 'Credit grant reference already used for different terms' using errcode = '23505';
    end if;
  end if;
  return v_lot.id;
end;
$$;

create function public.reserve_wallet_credits(
  p_owner uuid, p_service text, p_operation_id uuid, p_request_identity text, p_ttl_seconds integer
) returns table (status text, reservation_id uuid, cost integer, available bigint, result_id uuid)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_hold public.credit_service_reservations;
  v_cost integer;
  v_available bigint;
  v_remaining integer;
  v_slice integer;
  v_lot record;
  v_service_credit uuid;
  v_optimization_credit uuid;
  v_now timestamptz;
begin
  if p_ttl_seconds is null or p_ttl_seconds not between 15 and 3600 then
    raise exception 'Invalid reservation lease' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 742));
  select * into v_hold from public.credit_service_reservations r
    where r.owner_id = p_owner and r.service = p_service and r.operation_id = p_operation_id;
  if found then
    if v_hold.request_identity is distinct from p_request_identity then
      return query select 'conflict'::text, null::uuid, null::integer, null::bigint, null::uuid;
    else
      return query select (case when v_hold.status = 'reserved' then 'busy' else v_hold.status end),
        v_hold.id, v_hold.units, null::bigint, v_hold.result_id;
    end if;
    return;
  end if;
  if not exists (select 1 from public.credit_wallet_settings where enforcement_enabled) then
    return query select 'disabled'::text, null::uuid, null::integer, null::bigint, null::uuid;
    return;
  end if;
  v_now := clock_timestamp();
  select s.units into strict v_cost from public.credit_service_prices s where s.service = p_service;
  select coalesce(sum(e.available_delta), 0) into v_available
    from public.credit_lots l join public.credit_ledger e on e.lot_id = l.id
    where l.owner_id = p_owner and (l.expires_at is null or l.expires_at > v_now);
  select c.id into v_service_credit from public.user_service_credits c
    where c.user_id = p_owner and c.consumed_at is null
      and c.service_key in (p_service, case p_service when 'optimization' then 'resume_optimization'
        when 'mock_interview_start' then 'mock_interview' else p_service end)
      and not exists (select 1 from public.credit_service_reservations r
        where r.service_credit_id = c.id and r.status = 'reserved')
    order by c.granted_at, c.id limit 1 for update of c;
  if v_service_credit is null and p_service = 'optimization' then
    select c.id into v_optimization_credit from public.optimization_credits c
      where c.user_id = p_owner and c.consumed_at is null
        and not exists (select 1 from public.credit_service_reservations r
          where r.optimization_credit_id = c.id and r.status = 'reserved')
      order by c.granted_at, c.id limit 1 for update of c;
  end if;
  if v_available < v_cost and num_nonnulls(v_service_credit, v_optimization_credit) = 0 then
    return query select 'insufficient'::text, null::uuid, v_cost, v_available, null::uuid;
    return;
  end if;
  insert into public.credit_service_reservations(owner_id, service, operation_id, request_identity, units, expires_at,
    service_credit_id, optimization_credit_id)
    values (p_owner, p_service, p_operation_id, p_request_identity, v_cost,
      v_now + make_interval(secs => p_ttl_seconds), v_service_credit, v_optimization_credit)
    returning * into v_hold;
  if num_nonnulls(v_service_credit, v_optimization_credit) > 0 then
    return query select 'reserved'::text, v_hold.id, v_cost, v_available, null::uuid;
    return;
  end if;
  v_remaining := v_cost;
  for v_lot in
    select l.id, sum(e.available_delta) as available from public.credit_lots l
    join public.credit_ledger e on e.lot_id = l.id
    where l.owner_id = p_owner and (l.expires_at is null or l.expires_at > v_now)
    group by l.id
    having sum(e.available_delta) > 0
    order by l.expires_at nulls last, l.issued_at, l.id
  loop
    v_slice := least(v_remaining, v_lot.available);
    insert into public.credit_ledger(lot_id, reservation_id, kind, units)
      values (v_lot.id, v_hold.id, 'reserve', v_slice);
    v_remaining := v_remaining - v_slice;
    exit when v_remaining = 0;
  end loop;
  if v_remaining <> 0 then raise exception 'Credit allocation invariant failed'; end if;
  return query select 'reserved'::text, v_hold.id, v_cost, v_available - v_cost, null::uuid;
end;
$$;

-- Successful service writers must invoke this in the same transaction as the
-- saved result. A stale lease cannot publish a result after cleanup releases it.
create function public.finish_wallet_reservation(p_owner uuid, p_reservation uuid, p_result uuid default null)
returns text language plpgsql security definer
set search_path = ''
as $$
declare
  v_hold public.credit_service_reservations;
  v_kind text := case when p_result is null then 'release' else 'settle' end;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 742));
  select * into v_hold from public.credit_service_reservations where id = p_reservation and owner_id = p_owner;
  if not found then return 'missing'; end if;
  if v_hold.status <> 'reserved' then
    if p_result is not null and v_hold.result_id is distinct from p_result then return 'conflict'; end if;
    return v_hold.status;
  end if;
  if p_result is not null and v_hold.expires_at <= clock_timestamp() then return 'expired'; end if;
  if p_result is not null and v_hold.service_credit_id is not null then
    update public.user_service_credits set consumed_at = statement_timestamp()
      where id = v_hold.service_credit_id and user_id = p_owner and consumed_at is null;
    if not found then return 'conflict'; end if;
  elsif p_result is not null and v_hold.optimization_credit_id is not null then
    update public.optimization_credits set consumed_at = statement_timestamp(), consumed_package_id = p_result
      where id = v_hold.optimization_credit_id and user_id = p_owner and consumed_at is null;
    if not found then return 'conflict'; end if;
  end if;
  insert into public.credit_ledger(lot_id, reservation_id, kind, units)
    select e.lot_id, e.reservation_id, v_kind, e.units from public.credit_ledger e
    where e.reservation_id = v_hold.id and e.kind = 'reserve';
  update public.credit_service_reservations
    set status = case when p_result is null then 'released' else 'settled' end,
      result_id = p_result, finished_at = statement_timestamp()
    where id = v_hold.id returning * into v_hold;
  return v_hold.status;
end;
$$;

create function public.refund_wallet_reservation(p_owner uuid, p_reservation uuid)
returns integer language plpgsql security definer
set search_path = ''
as $$
declare
  v_units integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 742));
  with refunded as (
    insert into public.credit_ledger(lot_id, reservation_id, kind, units)
    select e.lot_id, e.reservation_id, 'refund', e.units
    from public.credit_ledger e join public.credit_service_reservations r on r.id = e.reservation_id
    where r.id = p_reservation and r.owner_id = p_owner and r.status = 'settled' and e.kind = 'settle'
    on conflict do nothing returning units
  )
  select coalesce(sum(units), 0) into v_units from refunded;
  return v_units;
end;
$$;

create function public.wallet_source_summary(p_owner uuid)
returns table (source text, available bigint, reserved bigint, earned bigint, used bigint, refunded bigint, expired bigint, reversed bigint)
language sql stable security definer
set search_path = ''
as $$
  select l.source,
    coalesce(sum(e.available_delta) filter (where l.expires_at is null or l.expires_at > statement_timestamp()), 0),
    coalesce(sum(e.reserved_delta), 0),
    coalesce(sum(e.units) filter (where e.kind = 'grant'), 0),
    coalesce(sum(e.units) filter (where e.kind = 'settle'), 0),
    coalesce(sum(e.units) filter (where e.kind = 'refund'), 0),
    coalesce(sum(e.units) filter (where e.kind = 'expire'), 0)
      + coalesce(sum(e.available_delta) filter (where l.expires_at <= statement_timestamp()), 0),
    coalesce(sum(e.units) filter (where e.kind = 'reverse'), 0)
  from public.credit_lots l join public.credit_ledger e on e.lot_id = l.id
  where l.owner_id = p_owner
  group by l.source
  order by l.source
$$;

revoke all on function public.grant_wallet_credits(uuid, text, uuid, integer, timestamptz),
  public.reserve_wallet_credits(uuid, text, uuid, text, integer),
  public.finish_wallet_reservation(uuid, uuid, uuid),
  public.refund_wallet_reservation(uuid, uuid),
  public.wallet_source_summary(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.grant_wallet_credits(uuid, text, uuid, integer, timestamptz),
  public.reserve_wallet_credits(uuid, text, uuid, text, integer),
  public.finish_wallet_reservation(uuid, uuid, uuid),
  public.refund_wallet_reservation(uuid, uuid),
  public.wallet_source_summary(uuid) to service_role;
