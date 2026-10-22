-- E4: aggregates only. File for orchestrator review; never applied by this task.
begin;
create table public.apple_sales_daily (day date not null, product_type text not null, country text not null, device text not null, app_version text not null, currency text not null, units bigint not null, proceeds numeric, primary key (day,product_type,country,device,app_version,currency));
alter table public.apple_sales_daily enable row level security;
revoke all on public.apple_sales_daily from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.apple_sales_daily to service_role;

create table public.apple_subscription_daily (day date not null, product_id text not null, country text not null, device text not null, paid bigint not null, trials bigint not null, billing_retry bigint not null, grace bigint not null, primary key (day,product_id,country,device));
alter table public.apple_subscription_daily enable row level security;
revoke all on public.apple_subscription_daily from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.apple_subscription_daily to service_role;

create table public.apple_subscription_events_daily (day date not null, product_id text not null, event text not null, country text not null, device text not null, quantity bigint not null, primary key (day,product_id,event,country,device));
alter table public.apple_subscription_events_daily enable row level security;
revoke all on public.apple_subscription_events_daily from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.apple_subscription_events_daily to service_role;

create table public.apple_analytics_daily (day date not null, report_name text not null, processing_date date not null, country text not null, device text not null, app_version text not null, source_type text not null, event text not null, page_type text not null, counts bigint not null, duration_seconds bigint, primary key (day,report_name,country,device,app_version,source_type,event,page_type));
alter table public.apple_analytics_daily enable row level security;
revoke all on public.apple_analytics_daily from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.apple_analytics_daily to service_role;

create table public.apple_fetch_log (source text not null check(source in ('sales','analytics')), report_key text not null check(length(report_key) between 1 and 180), day date not null, status text not null check(status in ('ok','pending','error')), rows integer not null default 0 check(rows >= 0), fetched_at timestamptz not null default now(), error_code text check(error_code ~ '^[a-z0-9_]{1,48}$'), primary key (source,report_key,day));
alter table public.apple_fetch_log enable row level security;
revoke all on public.apple_fetch_log from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.apple_fetch_log to service_role;

-- Lock, replacement and success journal commit together. New Analytics processing dates
-- replace the FULL partition for each report Date, never add overlapping instances.
create function public.apple_store_batch(p_source text, p_report_key text, p_day date,
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
      if p_report_name not in ('App Store Discovery and Engagement Standard','App Store Downloads Standard','App Sessions Standard','App Crashes') then raise exception 'invalid_apple_report'; end if;
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
revoke all on function public.apple_store_batch(text,text,date,text,jsonb,text,text) from public, anon, authenticated, service_role;
grant execute on function public.apple_store_batch(text,text,date,text,jsonb,text,text) to service_role;
commit;
