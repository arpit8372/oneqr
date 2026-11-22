begin;

alter table public.businesses
  add column review_url text,
  add constraint businesses_review_url_check
    check (review_url is null or review_url ~* '^https://[^[:space:]]+$');

create table public.customer_pages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  slug text not null unique default replace(gen_random_uuid()::text, '-', ''),
  headline text not null default 'Welcome'
    check (length(trim(headline)) between 1 and 100),
  description text not null default ''
    check (length(description) <= 600),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'paused')),
  published_content jsonb
    check (published_content is null or jsonb_typeof(published_content) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create table public.customer_page_links (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.customer_pages(id) on delete cascade,
  kind text not null
    check (kind in ('whatsapp', 'instagram', 'google_review', 'menu', 'website', 'custom')),
  label text not null check (length(trim(label)) between 1 and 60),
  url text,
  sort_order integer not null default 0 check (sort_order between 0 and 1000),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (kind = 'google_review' and url is null)
    or (kind <> 'google_review' and url is not null and url ~* '^https://[^[:space:]]+$')
  ),
  check (
    kind <> 'whatsapp'
    or url ~* '^https://(wa[.]me|api[.]whatsapp[.]com)(/|$)'
  ),
  check (
    kind <> 'instagram'
    or url ~* '^https://(www[.])?instagram[.]com(/|$)'
  )
);
create index customer_page_links_by_page_order
  on public.customer_page_links(page_id, sort_order, created_at);

create table public.dynamic_qr_codes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  page_id uuid not null,
  code text not null unique default replace(gen_random_uuid()::text, '-', '')
    check (code ~ '^[0-9a-f]{32}$'),
  name text not null check (length(trim(name)) between 1 and 80),
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (page_id, business_id)
    references public.customer_pages(id, business_id) on delete cascade
);
create index dynamic_qr_codes_by_business on public.dynamic_qr_codes(business_id, created_at);

alter table public.customer_pages enable row level security;
alter table public.customer_page_links enable row level security;
alter table public.dynamic_qr_codes enable row level security;

revoke all on public.customer_pages, public.customer_page_links, public.dynamic_qr_codes
  from public, anon, authenticated;
grant select, insert, update, delete
  on public.customer_pages, public.customer_page_links, public.dynamic_qr_codes
  to authenticated;

create function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses b
    join public.memberships m on m.tenant_id = b.tenant_id
    where b.id = p_business_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
      and m.status = 'active'
  );
$$;

create function public.is_customer_page_owner(p_page_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.customer_pages p
    where p.id = p_page_id
      and public.is_business_owner(p.business_id)
  );
$$;

revoke all on function public.is_business_owner(uuid) from public, anon, authenticated;
revoke all on function public.is_customer_page_owner(uuid) from public, anon, authenticated;
grant execute on function public.is_business_owner(uuid) to authenticated;
grant execute on function public.is_customer_page_owner(uuid) to authenticated;

create policy customer_pages_owner_all on public.customer_pages
  for all to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy customer_page_links_owner_all on public.customer_page_links
  for all to authenticated
  using (public.is_customer_page_owner(page_id))
  with check (public.is_customer_page_owner(page_id));

create policy dynamic_qr_codes_owner_all on public.dynamic_qr_codes
  for all to authenticated
  using (
    public.is_business_owner(business_id)
    and public.is_customer_page_owner(page_id)
  )
  with check (
    public.is_business_owner(business_id)
    and public.is_customer_page_owner(page_id)
  );

create function public.update_business_settings(
  p_business_id uuid,
  p_name text,
  p_category text,
  p_brand_color text,
  p_review_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_review_url text := nullif(pg_catalog.btrim(p_review_url), '');
begin
  if auth.uid() is null or not public.is_business_owner(p_business_id) then
    raise exception 'Not authorized to edit this business' using errcode = '42501';
  end if;
  if p_name is null or pg_catalog.length(pg_catalog.btrim(p_name)) not between 1 and 100 then
    raise exception 'Business name must be between 1 and 100 characters' using errcode = '22023';
  end if;
  if p_category is null
    or p_category not in ('Restaurant', 'Café', 'Salon', 'Local service', 'Other') then
    raise exception 'Invalid business category' using errcode = '22023';
  end if;
  if p_brand_color is null or p_brand_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Invalid brand color' using errcode = '22023';
  end if;
  if clean_review_url is not null and clean_review_url !~* '^https://[^[:space:]]+$' then
    raise exception 'Review URL must start with https://' using errcode = '22023';
  end if;

  update public.businesses
    set name = pg_catalog.btrim(p_name), category = p_category, review_url = clean_review_url
    where id = p_business_id;
  update public.business_branding
    set primary_color = p_brand_color, updated_at = pg_catalog.now()
    where business_id = p_business_id;
end;
$$;
revoke all on function public.update_business_settings(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.update_business_settings(uuid, text, text, text, text)
  to authenticated;

create function public.publish_customer_page(p_page_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
  target_headline text;
  target_description text;
  target_slug text;
  target_review_url text;
  visible_links jsonb;
begin
  select p.business_id, p.headline, p.description, p.slug
    into target_business_id, target_headline, target_description, target_slug
    from public.customer_pages p
    where p.id = p_page_id
    for update;
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
      'headline', target_headline,
      'description', target_description,
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

create function public.get_public_customer_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'businessName', b.name,
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

create function public.resolve_public_qr(p_code text)
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
  limit 1;
$$;

revoke all on function public.get_public_customer_page(text) from public, anon, authenticated;
revoke all on function public.resolve_public_qr(text) from public, anon, authenticated;
grant execute on function public.get_public_customer_page(text) to anon, authenticated;
grant execute on function public.resolve_public_qr(text) to anon, authenticated;

commit;
