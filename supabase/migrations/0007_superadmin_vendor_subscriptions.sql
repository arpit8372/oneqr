begin;

create table public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now()
);

alter table public.super_admins enable row level security;
revoke all on public.super_admins from public, anon, authenticated;

create table public.vendor_subscriptions (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  plan_name text not null check (pg_catalog.length(pg_catalog.btrim(plan_name)) between 1 and 60),
  months integer not null check (months between 1 and 120),
  status text not null check (status in ('active', 'paused')),
  starts_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > starts_at),
  updated_at timestamptz not null default pg_catalog.now(),
  updated_by uuid references auth.users(id)
);

alter table public.vendor_subscriptions enable row level security;
revoke all on public.vendor_subscriptions from public, anon, authenticated;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.super_admins s where s.user_id = auth.uid()
  );
$$;
revoke all on function public.is_super_admin() from public, anon, authenticated;
grant execute on function public.is_super_admin() to authenticated;

create function public.is_vendor_subscription_active(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vendor_subscriptions s
    join public.tenants t on t.id = s.tenant_id
    where s.tenant_id = p_tenant_id
      and s.status = 'active'
      and s.expires_at > pg_catalog.now()
      and t.status = 'active'
  );
$$;
revoke all on function public.is_vendor_subscription_active(uuid) from public, anon, authenticated;

create function public.admin_list_vendors()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  vendors jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Superadmin access required' using errcode = '42501';
  end if;

  select coalesce(pg_catalog.jsonb_agg(vendor order by created_at desc), '[]'::jsonb)
    into vendors
    from (
      select
        t.created_at,
        pg_catalog.jsonb_build_object(
          'tenantId', t.id,
          'tenantName', t.name,
          'tenantStatus', t.status,
          'createdAt', t.created_at,
          'ownerUserId', owner.user_id,
          'ownerEmail', owner.email,
          'ownerName', owner.full_name,
          'ownerPhone', owner.phone,
          'businessId', b.id,
          'businessName', b.name,
          'category', b.category,
          'phone', b.phone,
          'email', b.email,
          'websiteUrl', b.website_url,
          'reviewUrl', b.review_url,
          'locationText', b.location_text,
          'locationUrl', b.location_url,
          'profileEmoji', bb.profile_emoji,
          'primaryColor', bb.primary_color,
          'headline', p.headline,
          'description', p.description,
          'offerText', p.offer_text,
          'wifiSsid', p.wifi_ssid,
          'wifiPassword', p.wifi_password,
          'pageStatus', p.status,
          'profileImageUrl', bb.logo_url,
          'links', coalesce((
            select pg_catalog.jsonb_agg(
              pg_catalog.jsonb_build_object(
                'id', l.id,
                'kind', l.kind,
                'label', l.label,
                'url', case when l.kind = 'google_review' then b.review_url else l.url end,
                'visible', l.is_visible
              ) order by l.sort_order, l.created_at
            )
            from public.customer_page_links l where l.page_id = p.id
          ), '[]'::jsonb),
          'qrCodes', coalesce((
            select pg_catalog.jsonb_agg(
              pg_catalog.jsonb_build_object(
                'name', q.name,
                'code', q.code,
                'status', q.status,
                'createdAt', q.created_at
              ) order by q.created_at
            )
            from public.dynamic_qr_codes q where q.business_id = b.id
          ), '[]'::jsonb),
          'subscriptionStatus', coalesce(s.status, 'unassigned'),
          'planName', s.plan_name,
          'planMonths', s.months,
          'startsAt', s.starts_at,
          'expiresAt', s.expires_at
        ) as vendor
      from public.tenants t
      left join lateral (
        select m.user_id, u.email, pr.full_name, pr.phone
        from public.memberships m
        join auth.users u on u.id = m.user_id
        left join public.profiles pr on pr.id = m.user_id
        where m.tenant_id = t.id and m.role = 'owner'
        order by (m.status = 'active') desc, m.created_at
        limit 1
      ) owner on true
      left join lateral (
        select b.*
        from public.businesses b
        where b.tenant_id = t.id
        order by b.created_at, b.id
        limit 1
      ) b on true
      left join public.business_branding bb on bb.business_id = b.id
      left join public.customer_pages p on p.business_id = b.id
      left join public.vendor_subscriptions s on s.tenant_id = t.id
    ) vendor_rows;

  return vendors;
end;
$$;
revoke all on function public.admin_list_vendors() from public, anon, authenticated;
grant execute on function public.admin_list_vendors() to authenticated;

create function public.admin_update_vendor(
  p_tenant_id uuid,
  p_business_id uuid,
  p_tenant_name text,
  p_owner_name text,
  p_owner_phone text,
  p_business_name text,
  p_category text,
  p_profile_emoji text,
  p_primary_color text,
  p_phone text,
  p_email text,
  p_website_url text,
  p_review_url text,
  p_location_text text,
  p_location_url text,
  p_headline text,
  p_description text,
  p_offer_text text,
  p_wifi_ssid text,
  p_wifi_password text,
  p_links jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_tenant_name text := pg_catalog.btrim(p_tenant_name);
  clean_owner_name text := pg_catalog.btrim(coalesce(p_owner_name, ''));
  clean_owner_phone text := nullif(pg_catalog.btrim(p_owner_phone), '');
  clean_business_name text := pg_catalog.btrim(p_business_name);
  clean_category text := pg_catalog.btrim(p_category);
  clean_offer_text text := coalesce(p_offer_text, '');
  clean_wifi_ssid text := nullif(pg_catalog.btrim(p_wifi_ssid), '');
  clean_wifi_password text := nullif(pg_catalog.btrim(p_wifi_password), '');
  clean_phone text := nullif(pg_catalog.btrim(p_phone), '');
  clean_email text := nullif(pg_catalog.btrim(p_email), '');
  clean_website_url text := nullif(pg_catalog.btrim(p_website_url), '');
  clean_review_url text := nullif(pg_catalog.btrim(p_review_url), '');
  clean_location_text text := nullif(pg_catalog.btrim(p_location_text), '');
  clean_location_url text := nullif(pg_catalog.btrim(p_location_url), '');
  clean_headline text := pg_catalog.btrim(p_headline);
  clean_description text := coalesce(p_description, '');
  target_page_id uuid;
  links_snapshot jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Superadmin access required' using errcode = '42501';
  end if;
  if clean_tenant_name is null or pg_catalog.length(clean_tenant_name) not between 1 and 100
    or clean_business_name is null or pg_catalog.length(clean_business_name) not between 1 and 100
    or clean_category is null or pg_catalog.length(clean_category) not between 1 and 80
    or p_profile_emoji is null
    or p_profile_emoji not in ('🏪', '🍽️', '☕', '✂️', '💇', '🛍️', '🥐', '🌿', '🐾', '🏋️', '📸', '✨')
    or p_primary_color is null or p_primary_color !~ '^#[0-9A-Fa-f]{6}$'
    or clean_headline is null or pg_catalog.length(clean_headline) not between 1 and 100
    or pg_catalog.length(clean_description) > 600
    or pg_catalog.length(clean_offer_text) > 180
    or (clean_wifi_ssid is not null and pg_catalog.length(clean_wifi_ssid) not between 1 and 32)
    or (clean_wifi_password is not null and pg_catalog.length(clean_wifi_password) not between 1 and 64)
    or (clean_wifi_ssid is null and clean_wifi_password is not null) then
    raise exception 'One or more names or page fields have invalid lengths' using errcode = '22023';
  end if;
  if clean_phone is not null and clean_phone !~ '^[+0-9(). -]{5,30}$'
    or clean_owner_phone is not null and pg_catalog.length(clean_owner_phone) > 30
    or clean_email is not null and (
      pg_catalog.length(clean_email) > 254
      or clean_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
    ) then
    raise exception 'Vendor contact details are invalid' using errcode = '22023';
  end if;
  if (clean_website_url is not null and clean_website_url !~* '^https://[^[:space:]]+$')
    or (clean_review_url is not null and clean_review_url !~* '^https://[^[:space:]]+$')
    or (clean_location_url is not null and clean_location_url !~* '^https://[^[:space:]]+$')
    or pg_catalog.length(coalesce(clean_website_url, '')) > 2048
    or pg_catalog.length(coalesce(clean_review_url, '')) > 2048
    or pg_catalog.length(coalesce(clean_location_url, '')) > 2048
    or pg_catalog.length(coalesce(clean_location_text, '')) > 120 then
    raise exception 'Website, review, and location links must use HTTPS' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.tenant_id = p_tenant_id
  ) then
    raise exception 'Vendor business was not found' using errcode = '22023';
  end if;
  if p_links is null or pg_catalog.jsonb_typeof(p_links) <> 'array'
    or pg_catalog.jsonb_array_length(p_links) > 50 then
    raise exception 'Vendor links are invalid' using errcode = '22023';
  end if;
  select p.id into target_page_id
    from public.customer_pages p where p.business_id = p_business_id;
  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_links) as submitted(link_id uuid, label text, url text, visible boolean)
    left join public.customer_page_links l
      on l.id = submitted.link_id and l.page_id = target_page_id
    where l.id is null
      or submitted.label is null or pg_catalog.length(pg_catalog.btrim(submitted.label)) not between 1 and 60
      or submitted.visible is null
      or (l.kind <> 'google_review' and (
        submitted.url is null
        or pg_catalog.length(submitted.url) > 2048
        or submitted.url !~* '^https://[^[:space:]]+$'
      ))
  ) then
    raise exception 'One or more customer links are invalid' using errcode = '22023';
  end if;

  update public.tenants set name = clean_tenant_name where id = p_tenant_id;
  update public.businesses
    set name = clean_business_name,
        category = clean_category,
        phone = clean_phone,
        email = clean_email,
        website_url = clean_website_url,
        review_url = clean_review_url,
        location_text = clean_location_text,
        location_url = clean_location_url
    where id = p_business_id and tenant_id = p_tenant_id;
  update public.business_branding
    set profile_emoji = p_profile_emoji,
        primary_color = p_primary_color,
        updated_at = pg_catalog.now()
    where business_id = p_business_id;

  update public.profiles
    set full_name = clean_owner_name, phone = clean_owner_phone
    where id = (select t.owner_user_id from public.tenants t where t.id = p_tenant_id);

  update public.customer_page_links l
    set label = pg_catalog.btrim(submitted.label),
        url = case when l.kind = 'google_review' then null else submitted.url end,
        is_visible = submitted.visible
    from pg_catalog.jsonb_to_recordset(p_links) as submitted(link_id uuid, label text, url text, visible boolean)
    where l.id = submitted.link_id and l.page_id = target_page_id;
  select coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', l.id,
          'kind', l.kind,
          'label', l.label,
          'url', l.url,
          'sort_order', l.sort_order
        ) order by l.sort_order, l.created_at, l.id
      ),
      '[]'::jsonb
    )
    into links_snapshot
    from public.customer_page_links l
    where l.page_id = target_page_id and l.is_visible;

  update public.customer_pages p
    set headline = clean_headline,
        description = clean_description,
        offer_text = clean_offer_text,
        wifi_ssid = clean_wifi_ssid,
        wifi_password = clean_wifi_password,
        published_content = case
          when p.published_content is null then null
          else p.published_content || pg_catalog.jsonb_build_object(
            'businessName', clean_business_name,
            'businessCategory', clean_category,
            'phone', clean_phone,
            'email', clean_email,
            'websiteUrl', clean_website_url,
            'locationText', clean_location_text,
            'locationUrl', clean_location_url,
            'headline', clean_headline,
            'description', clean_description,
            'offerText', clean_offer_text,
            'wifiSsid', clean_wifi_ssid,
            'wifiPassword', clean_wifi_password,
            'profileEmoji', p_profile_emoji,
            'primaryColor', p_primary_color,
            'links', links_snapshot
          )
        end,
        updated_at = pg_catalog.now()
    where p.business_id = p_business_id;
end;
$$;
revoke all on function public.admin_update_vendor(
  uuid, uuid,
  text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.admin_update_vendor(
  uuid, uuid,
  text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, jsonb
) to authenticated;

create function public.admin_set_vendor_subscription(
  p_tenant_id uuid,
  p_plan_name text,
  p_months integer,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  clean_plan_name text := pg_catalog.btrim(p_plan_name);
begin
  if not public.is_super_admin() then
    raise exception 'Superadmin access required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('active', 'paused')
    or clean_plan_name is null or pg_catalog.length(clean_plan_name) not between 1 and 60
    or p_months is null or p_months not between 1 and 120 then
    raise exception 'Choose a plan, 1 to 120 months, and a valid status' using errcode = '22023';
  end if;
  if not exists (select 1 from public.tenants t where t.id = p_tenant_id) then
    raise exception 'Vendor workspace was not found' using errcode = '22023';
  end if;

  if p_status = 'active' then
    insert into public.vendor_subscriptions(
      tenant_id, plan_name, months, status, starts_at, expires_at, updated_at, updated_by
    )
    values (
      p_tenant_id, clean_plan_name, p_months, 'active', pg_catalog.now(),
      pg_catalog.now() + pg_catalog.make_interval(months => p_months),
      pg_catalog.now(), actor
    )
    on conflict (tenant_id) do update
      set plan_name = excluded.plan_name,
          months = excluded.months,
          status = 'active',
          starts_at = excluded.starts_at,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by;
  else
    insert into public.vendor_subscriptions(
      tenant_id, plan_name, months, status, starts_at, expires_at, updated_at, updated_by
    )
    values (
      p_tenant_id, clean_plan_name, p_months, 'paused', pg_catalog.now(),
      pg_catalog.now() + pg_catalog.make_interval(months => p_months),
      pg_catalog.now(), actor
    )
    on conflict (tenant_id) do update
      set plan_name = excluded.plan_name,
          months = excluded.months,
          status = 'paused',
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by;
  end if;
end;
$$;
revoke all on function public.admin_set_vendor_subscription(uuid, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_vendor_subscription(uuid, text, integer, text)
  to authenticated;

create or replace function public.publish_customer_page(p_page_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
  target_tenant_id uuid;
  target_business_name text;
  target_business_category text;
  target_profile_emoji text;
  target_primary_color text;
  target_profile_image_url text;
  target_headline text;
  target_description text;
  target_phone text;
  target_email text;
  target_website_url text;
  target_location_text text;
  target_location_url text;
  target_offer_text text;
  target_wifi_ssid text;
  target_wifi_password text;
  target_slug text;
  target_review_url text;
  visible_links jsonb;
begin
  select p.business_id, b.tenant_id, b.name, b.category, bb.profile_emoji, bb.primary_color, bb.logo_url,
         p.headline, p.description, b.phone, b.email, b.website_url,
         b.location_text, b.location_url, p.offer_text, p.wifi_ssid, p.wifi_password, p.slug
    into target_business_id, target_tenant_id, target_business_name, target_business_category,
         target_profile_emoji, target_primary_color, target_profile_image_url,
         target_headline, target_description, target_phone, target_email, target_website_url,
         target_location_text, target_location_url, target_offer_text, target_wifi_ssid,
         target_wifi_password, target_slug
    from public.customer_pages p
    join public.businesses b on b.id = p.business_id
    join public.business_branding bb on bb.business_id = b.id
    where p.id = p_page_id
    for update of p;
  if target_business_id is null or not public.is_business_owner(target_business_id) then
    raise exception 'Not authorized to publish this page' using errcode = '42501';
  end if;
  if not public.is_vendor_subscription_active(target_tenant_id) then
    raise exception 'An active subscription is required to publish this page' using errcode = '22023';
  end if;

  select b.review_url into target_review_url
    from public.businesses b where b.id = target_business_id;
  if exists (
    select 1 from public.customer_page_links l
    where l.page_id = p_page_id and l.kind = 'google_review' and l.is_visible
  ) and target_review_url is null then
    raise exception 'Set the business Google review URL before publishing' using errcode = '22023';
  end if;

  select coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', l.id,
          'kind', l.kind,
          'label', l.label,
          'url', l.url,
          'sort_order', l.sort_order
        ) order by l.sort_order, l.created_at, l.id
      ),
      '[]'::jsonb
    )
    into visible_links
    from public.customer_page_links l
    where l.page_id = p_page_id and l.is_visible;

  update public.customer_pages
    set published_content = pg_catalog.jsonb_build_object(
      'businessName', target_business_name,
      'businessCategory', target_business_category,
      'profileEmoji', target_profile_emoji,
      'profileImageUrl', target_profile_image_url,
      'primaryColor', target_primary_color,
      'headline', target_headline,
      'description', target_description,
      'phone', target_phone,
      'email', target_email,
      'websiteUrl', target_website_url,
      'locationText', target_location_text,
      'locationUrl', target_location_url,
      'offerText', target_offer_text,
      'wifiSsid', target_wifi_ssid,
      'wifiPassword', target_wifi_password,
      'links', visible_links
    ),
    status = 'published',
    updated_at = pg_catalog.now()
    where id = p_page_id;
  return target_slug;
end;
$$;
revoke all on function public.publish_customer_page(uuid) from public, anon, authenticated;
grant execute on function public.publish_customer_page(uuid) to authenticated;

create or replace function public.get_public_customer_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'businessName', p.published_content ->> 'businessName',
    'businessCategory', p.published_content ->> 'businessCategory',
    'profileEmoji', p.published_content ->> 'profileEmoji',
    'profileImageUrl', p.published_content ->> 'profileImageUrl',
    'primaryColor', p.published_content ->> 'primaryColor',
    'headline', p.published_content ->> 'headline',
    'description', p.published_content ->> 'description',
    'phone', p.published_content ->> 'phone',
    'email', p.published_content ->> 'email',
    'websiteUrl', p.published_content ->> 'websiteUrl',
    'locationText', p.published_content ->> 'locationText',
    'locationUrl', p.published_content ->> 'locationUrl',
    'offerText', p.published_content ->> 'offerText',
    'wifiSsid', p.published_content ->> 'wifiSsid',
    'wifiPassword', p.published_content ->> 'wifiPassword',
    'links', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', item ->> 'id',
          'kind', item ->> 'kind',
          'label', item ->> 'label',
          'url', case
            when item ->> 'kind' = 'google_review' then b.review_url
            else item ->> 'url'
          end
        ) order by (item ->> 'sort_order')::integer
      )
      from pg_catalog.jsonb_array_elements(p.published_content -> 'links') item
      where item ->> 'kind' <> 'google_review' or b.review_url is not null
    ), '[]'::jsonb)
  )
  from public.customer_pages p
  join public.businesses b on b.id = p.business_id
  where p.slug = p_slug
    and p.status = 'published'
    and p.published_content is not null
    and b.status = 'active'
    and public.is_vendor_subscription_active(b.tenant_id);
$$;
revoke all on function public.get_public_customer_page(text) from public, anon, authenticated;
grant execute on function public.get_public_customer_page(text) to anon, authenticated;

create or replace function public.resolve_public_qr(p_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.slug
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
$$;
revoke all on function public.resolve_public_qr(text) from public, anon, authenticated;
grant execute on function public.resolve_public_qr(text) to anon, authenticated;

commit;
