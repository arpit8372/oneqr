begin;

create table public.qr_analytics_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  qr_code_id uuid not null references public.dynamic_qr_codes(id) on delete cascade,
  event_type text not null check (event_type in ('qr_scan', 'link_click')),
  link_kind text,
  link_label text,
  created_at timestamptz not null default pg_catalog.now(),
  check (
    (event_type = 'qr_scan' and link_kind is null and link_label is null)
    or (event_type = 'link_click' and link_kind is not null and link_label is not null)
  )
);

alter table public.qr_analytics_events enable row level security;
revoke all on public.qr_analytics_events from public, anon, authenticated;

create index qr_analytics_by_business_time
  on public.qr_analytics_events(business_id, created_at desc);
create index qr_analytics_by_qr_event
  on public.qr_analytics_events(qr_code_id, event_type, created_at desc);

create function public.track_public_qr_scan(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_slug text;
  target_business_id uuid;
  target_qr_code_id uuid;
begin
  select p.slug, b.id, q.id
    into target_slug, target_business_id, target_qr_code_id
  from public.dynamic_qr_codes q
  join public.customer_pages p on p.id = q.page_id and p.business_id = q.business_id
  join public.businesses b on b.id = q.business_id
  where q.code = p_code
    and q.status = 'active'
    and p.status = 'published'
    and p.published_content is not null
    and b.status = 'active'
    and public.is_vendor_subscription_active(b.tenant_id)
  limit 1;

  if target_qr_code_id is null then
    return null;
  end if;

  insert into public.qr_analytics_events(business_id, qr_code_id, event_type)
    values (target_business_id, target_qr_code_id, 'qr_scan');

  return target_slug;
end;
$$;
revoke all on function public.track_public_qr_scan(text) from public, anon, authenticated;
grant execute on function public.track_public_qr_scan(text) to anon, authenticated;

create function public.track_public_qr_action(
  p_slug text,
  p_qr_code text,
  p_link_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
  target_qr_code_id uuid;
  target_website_url text;
  target_location_url text;
  target_phone text;
  target_email text;
  target_link_kind text;
  target_link_label text;
begin
  select b.id, q.id, b.website_url, b.location_url, b.phone, b.email, l.kind, l.label
    into target_business_id, target_qr_code_id, target_website_url, target_location_url,
         target_phone, target_email, target_link_kind, target_link_label
  from public.customer_pages p
  join public.businesses b on b.id = p.business_id
  join public.dynamic_qr_codes q
    on q.business_id = b.id and q.code = p_qr_code and q.status = 'active'
  left join public.customer_page_links l
    on l.page_id = p.id and l.id::text = p_link_key and l.is_visible
  where p.slug = p_slug
    and p.status = 'published'
    and p.published_content is not null
    and b.status = 'active'
    and public.is_vendor_subscription_active(b.tenant_id)
    and (l.id is not null or p_link_key in (
      'business-website', 'business-directions', 'business-phone', 'business-email'
    ))
  limit 1;

  if target_qr_code_id is null then
    return;
  end if;

  if target_link_kind is null then
    case p_link_key
      when 'business-website' then
        if target_website_url is null then return; end if;
        target_link_kind := 'website';
        target_link_label := 'Website';
      when 'business-directions' then
        if target_location_url is null then return; end if;
        target_link_kind := 'directions';
        target_link_label := 'Get directions';
      when 'business-phone' then
        if target_phone is null then return; end if;
        target_link_kind := 'call';
        target_link_label := 'Call us';
      when 'business-email' then
        if target_email is null then return; end if;
        target_link_kind := 'email';
        target_link_label := 'Email us';
      else
        return;
    end case;
  end if;

  insert into public.qr_analytics_events(
    business_id, qr_code_id, event_type, link_kind, link_label
  )
  values (
    target_business_id, target_qr_code_id, 'link_click', target_link_kind, target_link_label
  );
end;
$$;
revoke all on function public.track_public_qr_action(text, text, text)
  from public, anon, authenticated;
grant execute on function public.track_public_qr_action(text, text, text)
  to anon, authenticated;

create function public.get_business_qr_analytics(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  report jsonb;
begin
  if not public.is_business_owner(p_business_id) then
    raise exception 'Business owner access required' using errcode = '42501';
  end if;

  with qr_summary as (
    select
      q.id,
      q.name,
      q.code,
      count(e.id) filter (where e.event_type = 'qr_scan') as scans,
      count(e.id) filter (where e.event_type = 'link_click') as clicks
    from public.dynamic_qr_codes q
    left join public.qr_analytics_events e on e.qr_code_id = q.id
    where q.business_id = p_business_id
    group by q.id
  ),
  action_totals as (
    select qr_code_id, link_kind, link_label, count(*) as clicks
    from public.qr_analytics_events
    where business_id = p_business_id and event_type = 'link_click'
    group by qr_code_id, link_kind, link_label
  )
  select pg_catalog.jsonb_build_object(
    'totalScans', (
      select count(*) from public.qr_analytics_events
      where business_id = p_business_id and event_type = 'qr_scan'
    ),
    'totalClicks', (
      select count(*) from public.qr_analytics_events
      where business_id = p_business_id and event_type = 'link_click'
    ),
    'actions', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'kind', totals.link_kind,
          'label', totals.link_label,
          'clicks', totals.clicks
        ) order by totals.clicks desc, totals.link_label
      )
      from (
        select link_kind, link_label, count(*) as clicks
        from public.qr_analytics_events
        where business_id = p_business_id and event_type = 'link_click'
        group by link_kind, link_label
      ) totals
    ), '[]'::jsonb),
    'qrCodes', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', q.id,
          'name', q.name,
          'code', q.code,
          'scans', q.scans,
          'clicks', q.clicks,
          'actions', coalesce((
            select pg_catalog.jsonb_agg(
              pg_catalog.jsonb_build_object(
                'kind', a.link_kind,
                'label', a.link_label,
                'clicks', a.clicks
              ) order by a.clicks desc, a.link_label
            )
            from action_totals a
            where a.qr_code_id = q.id
          ), '[]'::jsonb)
        ) order by q.name
      )
      from qr_summary q
    ), '[]'::jsonb)
  ) into report;

  return report;
end;
$$;
revoke all on function public.get_business_qr_analytics(uuid)
  from public, anon, authenticated;
grant execute on function public.get_business_qr_analytics(uuid) to authenticated;

commit;
