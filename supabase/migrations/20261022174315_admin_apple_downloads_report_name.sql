-- Nome real do relatório na Apple é "App Downloads Standard" (não "App Store Downloads Standard"). Mantém grants.
create or replace function public.apple_store_batch(p_source text, p_report_key text, p_day date,
  p_status text, p_rows jsonb default '[]'::jsonb, p_report_name text default '', p_error_code text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare d date; current_date_processed date;
begin
  if p_source not in ('sales','analytics') or p_status not in ('ok','pending','error')
     or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 150000 then
    raise exception 'invalid_apple_batch';
  end if;
  perform pg_advisory_xact_lock(hashtext('apple:' || p_source || ':' || case when p_source = 'analytics' then p_report_name else p_report_key end));
  if p_status = 'ok' then
    if p_source = 'sales' then
      if p_report_key = 'SALES' then
        delete from public.apple_sales_daily where day = p_day;
        insert into public.apple_sales_daily (day,product_type,country,device,app_version,currency,units,proceeds) select day,product_type,country,device,app_version,currency,units,proceeds from jsonb_populate_recordset(null::public.apple_sales_daily, p_rows) where day = p_day;
      elsif p_report_key = 'SUBSCRIPTION' then
        delete from public.apple_subscription_daily where day = p_day;
        insert into public.apple_subscription_daily (day,product_id,country,device,paid,trials,billing_retry,grace) select day,product_id,country,device,paid,trials,billing_retry,grace from jsonb_populate_recordset(null::public.apple_subscription_daily, p_rows) where day = p_day;
      elsif p_report_key = 'SUBSCRIPTION_EVENT' then
        delete from public.apple_subscription_events_daily where day = p_day;
        insert into public.apple_subscription_events_daily (day,product_id,event,country,device,quantity) select day,product_id,event,country,device,quantity from jsonb_populate_recordset(null::public.apple_subscription_events_daily, p_rows) where day = p_day;
      else raise exception 'invalid_apple_report'; end if;
    else
      if p_report_name not in ('App Store Discovery and Engagement Standard','App Downloads Standard','App Sessions Standard','App Crashes') then raise exception 'invalid_apple_report'; end if;
      for d in select distinct (v->>'day')::date from jsonb_array_elements(p_rows) v loop
        select max(processing_date) into current_date_processed from public.apple_analytics_daily where day = d and report_name = p_report_name;
        if current_date_processed is null or current_date_processed <= p_day then
          delete from public.apple_analytics_daily where day = d and report_name = p_report_name;
          insert into public.apple_analytics_daily (day,report_name,processing_date,country,device,app_version,source_type,event,page_type,counts,duration_seconds)
          select day,p_report_name,p_day,country,device,app_version,source_type,event,page_type,counts,duration_seconds
          from jsonb_populate_recordset(null::public.apple_analytics_daily, p_rows) where day = d;
        end if;
      end loop;
    end if;
  end if;
  insert into public.apple_fetch_log(source,report_key,day,status,rows,fetched_at,error_code)
  values(p_source,p_report_key,p_day,p_status,jsonb_array_length(p_rows),now(),p_error_code)
  on conflict(source,report_key,day) do update set status = excluded.status, rows = excluded.rows, fetched_at = excluded.fetched_at, error_code = excluded.error_code
  where apple_fetch_log.status <> 'ok' or excluded.status = 'ok';
end;
$$;
