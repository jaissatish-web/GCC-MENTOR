-- Reuse package writers and commit their results with the credit settlement.
-- This RPC is used exclusively by validated server-side generation routes.
create function public.save_credit_backed_package_result(
  p_owner uuid, p_package uuid, p_reservation uuid,
  p_service text, p_result uuid, p_data jsonb, p_event jsonb default null
) returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_hold public.credit_service_reservations;
  v_saved boolean := false;
  v_fields public.packages;
begin
  if p_result is null or p_package is null then raise exception 'Missing result or package'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 742));
  select * into v_hold from public.credit_service_reservations
    where id = p_reservation and owner_id = p_owner and service = p_service
      and split_part(request_identity, ':', 1) = p_package::text;
  if not found then return false; end if;
  if v_hold.status = 'settled' then return v_hold.result_id = p_result; end if;
  if v_hold.status <> 'reserved' or v_hold.expires_at <= clock_timestamp() then return false; end if;

  case p_service
    when 'cover_letter' then
      if p_result::text <> p_data ->> 'id' then return false; end if;
      v_saved := public.package_append_cover_letter(p_package, p_owner, p_data, p_event);
    when 'interview_qa' then
      if p_result::text <> p_data ->> 'id' then return false; end if;
      v_saved := public.package_set_interview_questions(p_package, p_owner, p_data, p_event);
    when 'mock_interview_start' then
      if p_result::text <> p_data -> 'run' ->> 'id' then return false; end if;
      if p_data -> 'run' ->> 'input_mode' = 'voice' then
        v_saved := public.voice_start_session(p_package, p_owner, p_data -> 'run',
          p_data -> 'profile', p_data ->> 'fingerprint', p_data ->> 'rubric');
      else
        v_saved := public.package_append_mock_run(p_package, p_owner, p_data -> 'run', p_event);
      end if;
    when 'optimization' then
      if p_result <> p_package or not (p_data ? 'optimized_content') then return false; end if;
      select * into v_fields from jsonb_populate_record(null::public.packages, p_data);
      update public.packages
         set optimized_content = v_fields.optimized_content,
             skills_order = v_fields.skills_order,
             field_visibility_snapshot = v_fields.field_visibility_snapshot,
             document_snapshot = v_fields.document_snapshot,
             match_report = v_fields.match_report,
             structured_job = case when p_data ? 'structured_job' then v_fields.structured_job else structured_job end,
             target_country = case when p_data ? 'target_country' then v_fields.target_country else target_country end,
             target_company = case when p_data ? 'target_company' then v_fields.target_company else target_company end
       where id = p_package and user_id = p_owner and tier is distinct from 'free' and optimized_content is null;
      v_saved := found;
      if v_saved and p_event is not null then
        perform public.package_append_event(p_package, p_owner, p_event, 0);
      end if;
    else return false;
  end case;
  if v_saved and public.finish_wallet_reservation(p_owner, p_reservation, p_result) <> 'settled' then
    raise exception 'Credit-backed result could not be settled; result not written' using errcode = '40001';
  end if;
  return coalesce(v_saved, false);
end;
$$;

-- Called by the authenticated retention route. Status is rechecked under the
-- same user lock held by the package writer.
create function public.reconcile_stale_wallet_reservations(p_limit integer default 100)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_hold record;
  v_released integer := 0;
begin
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid cleanup batch'; end if;
  for v_hold in
    select id, owner_id from public.credit_service_reservations
    where status = 'reserved' and expires_at <= clock_timestamp()
    order by owner_id, expires_at, id limit p_limit
  loop
    if public.finish_wallet_reservation(v_hold.owner_id, v_hold.id) = 'released' then
      v_released := v_released + 1;
    end if;
  end loop;
  return v_released;
end;
$$;

revoke all on function public.save_credit_backed_package_result(uuid, uuid, uuid, text, uuid, jsonb, jsonb),
  public.reconcile_stale_wallet_reservations(integer) from public, anon, authenticated, service_role;
grant execute on function public.save_credit_backed_package_result(uuid, uuid, uuid, text, uuid, jsonb, jsonb),
  public.reconcile_stale_wallet_reservations(integer) to service_role;
