begin;

alter table public.businesses
  add column location_text text
    check (location_text is null or pg_catalog.length(location_text) <= 120),
  add column location_url text
    check (location_url is null or location_url ~* '^https://[^[:space:]]+$');

alter table public.customer_pages
  add column offer_text text not null default ''
    check (pg_catalog.length(offer_text) <= 180),
  add column wifi_ssid text
    check (wifi_ssid is null or pg_catalog.length(wifi_ssid) between 1 and 32),
  add column wifi_password text
    check (wifi_password is null or pg_catalog.length(wifi_password) <= 64),
  add constraint customer_pages_wifi_password_requires_ssid
    check (wifi_ssid is not null or wifi_password is null);

create function public.save_business_profile_details(
  p_name text,
  p_category text,
  p_profile_emoji text,
  p_review_url text,
  p_phone text,
  p_email text,
  p_website_url text,
  p_location_text text,
  p_location_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  workspace_id uuid;
  target_business_id uuid;
  clean_name text := pg_catalog.btrim(p_name);
  clean_category text := pg_catalog.btrim(p_category);
  clean_review_url text := nullif(pg_catalog.btrim(p_review_url), '');
  clean_phone text := nullif(pg_catalog.btrim(p_phone), '');
  clean_email text := nullif(pg_catalog.btrim(p_email), '');
  clean_website_url text := nullif(pg_catalog.btrim(p_website_url), '');
  clean_location_text text := nullif(pg_catalog.btrim(p_location_text), '');
  clean_location_url text := nullif(pg_catalog.btrim(p_location_url), '');
begin
  if actor is null then
    raise exception 'Sign in to save a business profile' using errcode = '42501';
  end if;
  if clean_name is null or pg_catalog.length(clean_name) not between 1 and 100 then
    raise exception 'Business name must be between 1 and 100 characters' using errcode = '22023';
  end if;
  if clean_category is null or pg_catalog.length(clean_category) not between 1 and 80 then
    raise exception 'Business type must be between 1 and 80 characters' using errcode = '22023';
  end if;
  if p_profile_emoji is null
    or p_profile_emoji not in ('🏪', '🍽️', '☕', '✂️', '💇', '🛍️', '🥐', '🌿', '🐾', '🏋️', '📸', '✨') then
    raise exception 'Choose a supported profile icon' using errcode = '22023';
  end if;
  if clean_review_url is not null
    and (pg_catalog.length(clean_review_url) > 2048 or clean_review_url !~* '^https://[^[:space:]]+$') then
    raise exception 'Review URL must start with https://' using errcode = '22023';
  end if;
  if clean_phone is not null and clean_phone !~ '^[+0-9(). -]{5,30}$' then
    raise exception 'Enter a valid phone number' using errcode = '22023';
  end if;
  if clean_email is not null
    and (pg_catalog.length(clean_email) > 254 or clean_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  if clean_website_url is not null
    and (pg_catalog.length(clean_website_url) > 2048 or clean_website_url !~* '^https://[^[:space:]]+$') then
    raise exception 'Website URL must start with https://' using errcode = '22023';
  end if;
  if clean_location_text is not null and pg_catalog.length(clean_location_text) > 120 then
    raise exception 'Location must be 120 characters or fewer' using errcode = '22023';
  end if;
  if clean_location_url is not null
    and (pg_catalog.length(clean_location_url) > 2048 or clean_location_url !~* '^https://[^[:space:]]+$') then
    raise exception 'Directions URL must start with https://' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 0));
  select b.id into target_business_id
    from public.businesses b
    join public.tenants t on t.id = b.tenant_id
    where t.owner_user_id = actor and t.type = 'direct_business'
    order by b.created_at, b.id
    limit 1;

  if target_business_id is not null then
    update public.businesses
      set name = clean_name,
          category = clean_category,
          review_url = clean_review_url,
          phone = clean_phone,
          email = clean_email,
          website_url = clean_website_url,
          location_text = clean_location_text,
          location_url = clean_location_url
      where id = target_business_id;
    update public.business_branding as bb
      set profile_emoji = p_profile_emoji, updated_at = pg_catalog.now()
      where bb.business_id = target_business_id;
    return target_business_id;
  end if;

  insert into public.profiles(id) values (actor)
    on conflict (id) do nothing;
  insert into public.tenants(name, slug, owner_user_id)
    values (clean_name, 'workspace-' || gen_random_uuid()::text, actor)
    returning id into workspace_id;
  insert into public.memberships(tenant_id, user_id, role)
    values (workspace_id, actor, 'owner');
  insert into public.businesses(
    tenant_id, name, category, review_url, phone, email, website_url, location_text, location_url
  )
    values (
      workspace_id, clean_name, clean_category, clean_review_url,
      clean_phone, clean_email, clean_website_url, clean_location_text, clean_location_url
    )
    returning id into target_business_id;
  insert into public.business_branding(business_id, profile_emoji)
    values (target_business_id, p_profile_emoji);

  return target_business_id;
end;
$$;

revoke all on function public.save_business_profile_details(text, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_business_profile_details(text, text, text, text, text, text, text, text, text)
  to authenticated;

update public.customer_pages p
  set published_content = p.published_content || pg_catalog.jsonb_build_object(
    'businessName', b.name,
    'businessCategory', b.category,
    'profileEmoji', bb.profile_emoji,
    'primaryColor', bb.primary_color,
    'phone', null,
    'email', null,
    'websiteUrl', null,
    'locationText', null,
    'locationUrl', null,
    'offerText', p.offer_text,
    'wifiSsid', p.wifi_ssid,
    'wifiPassword', p.wifi_password
  )
  from public.businesses b
  join public.business_branding bb on bb.business_id = b.id
  where p.business_id = b.id
    and p.status = 'published'
    and p.published_content is not null;

create or replace function public.publish_customer_page(p_page_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
  target_business_name text;
  target_business_category text;
  target_profile_emoji text;
  target_primary_color text;
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
  select p.business_id, b.name, b.category, bb.profile_emoji, bb.primary_color,
         p.headline, p.description, b.phone, b.email, b.website_url,
         b.location_text, b.location_url, p.offer_text, p.wifi_ssid, p.wifi_password, p.slug
    into target_business_id, target_business_name, target_business_category,
         target_profile_emoji, target_primary_color, target_headline, target_description,
         target_phone, target_email, target_website_url, target_location_text, target_location_url,
         target_offer_text, target_wifi_ssid, target_wifi_password, target_slug
    from public.customer_pages p
    join public.businesses b on b.id = p.business_id
    join public.business_branding bb on bb.business_id = b.id
    where p.id = p_page_id
    for update of p;
  if target_business_id is null or not public.is_business_owner(target_business_id) then
    raise exception 'Not authorized to publish this page' using errcode = '42501';
  end if;

  select b.review_url into target_review_url
    from public.businesses b where b.id = target_business_id;
  if exists (
    select 1 from public.customer_page_links l
    where l.page_id = p_page_id and l.kind = 'google_review' and l.is_visible
  ) and target_review_url is null then
    raise exception 'Set the business Google review URL before publishing' using errcode = '22023';
  end if;

  select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', l.id,
        'kind', l.kind,
        'label', l.label,
        'url', l.url,
        'sort_order', l.sort_order
      ) order by l.sort_order, l.created_at, l.id
    )
    into visible_links
    from public.customer_page_links l
    where l.page_id = p_page_id and l.is_visible;
  if visible_links is null or pg_catalog.jsonb_array_length(visible_links) = 0 then
    raise exception 'Add at least one visible button before publishing' using errcode = '22023';
  end if;

  update public.customer_pages
    set published_content = pg_catalog.jsonb_build_object(
      'businessName', target_business_name,
      'businessCategory', target_business_category,
      'profileEmoji', target_profile_emoji,
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
    and b.status = 'active';
$$;

revoke all on function public.publish_customer_page(uuid)
  from public, anon, authenticated;
grant execute on function public.publish_customer_page(uuid)
  to authenticated;
revoke all on function public.get_public_customer_page(text)
  from public, anon, authenticated;
grant execute on function public.get_public_customer_page(text)
  to anon, authenticated;

commit;
