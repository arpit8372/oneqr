begin;

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

revoke all on function public.publish_customer_page(uuid)
  from public, anon, authenticated;
grant execute on function public.publish_customer_page(uuid)
  to authenticated;

commit;
