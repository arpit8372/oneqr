begin;

alter table public.businesses
  drop constraint if exists businesses_category_check;

alter table public.businesses
  add constraint businesses_category_check
  check (pg_catalog.length(pg_catalog.btrim(category)) between 1 and 80);

alter table public.business_branding
  add column profile_emoji text not null default '🏪'
  check (profile_emoji in ('🏪', '🍽️', '☕', '✂️', '💇', '🛍️', '🥐', '🌿', '🐾', '🏋️', '📸', '✨'));

create function public.save_business_profile(
  p_name text,
  p_category text,
  p_profile_emoji text,
  p_review_url text
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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 0));
  select b.id into target_business_id
    from public.businesses b
    join public.tenants t on t.id = b.tenant_id
    where t.owner_user_id = actor and t.type = 'direct_business'
    order by b.created_at, b.id
    limit 1;

  if target_business_id is not null then
    update public.businesses
      set name = clean_name, category = clean_category, review_url = clean_review_url
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
  insert into public.businesses(tenant_id, name, category, review_url)
    values (workspace_id, clean_name, clean_category, clean_review_url)
    returning id into target_business_id;
  insert into public.business_branding(business_id, profile_emoji)
    values (target_business_id, p_profile_emoji);

  return target_business_id;
end;
$$;

revoke all on function public.save_business_profile(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_business_profile(text, text, text, text)
  to authenticated;

create or replace function public.get_public_customer_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'businessName', b.name,
    'profileEmoji', bb.profile_emoji,
    'primaryColor', bb.primary_color,
    'headline', p.published_content ->> 'headline',
    'description', p.published_content ->> 'description',
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
  join public.business_branding bb on bb.business_id = b.id
  where p.slug = p_slug
    and p.status = 'published'
    and p.published_content is not null
    and b.status = 'active';
$$;

revoke all on function public.get_public_customer_page(text)
  from public, anon, authenticated;
grant execute on function public.get_public_customer_page(text)
  to anon, authenticated;

commit;
