begin;
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  slug text not null unique,
  type text not null default 'direct_business' check (type in ('direct_business','agency')),
  status text not null default 'active' check (status in ('active','pending','suspended')),
  owner_user_id uuid not null references auth.users,
  parent_tenant_id uuid references public.tenants,
  created_at timestamptz not null default now()
);
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('owner','admin','manager','staff')),
  status text not null default 'active' check (status in ('invited','active','disabled')),
  invited_by uuid references auth.users,
  created_at timestamptz not null default now(),
  unique (tenant_id,user_id)
);
create index memberships_by_user on public.memberships(user_id,tenant_id);
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  category text not null check (category in ('Restaurant','Café','Salon','Local service','Other')),
  description text,
  phone text,
  email text,
  website_url text,
  address jsonb,
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);
create index businesses_by_tenant on public.businesses(tenant_id);
create table public.business_branding (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses on delete cascade,
  primary_color text not null default '#245b49' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color text not null default '#f6f7f2',
  text_color text not null default '#202a25',
  logo_url text,
  welcome_title text,
  welcome_description text,
  font_style text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.businesses enable row level security;
alter table public.business_branding enable row level security;

revoke all on public.profiles, public.tenants, public.memberships, public.businesses, public.business_branding from public, anon, authenticated;
grant select on public.profiles, public.tenants, public.memberships, public.businesses, public.business_branding to authenticated;
create policy profile_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy membership_self on public.memberships for select to authenticated using (user_id = (select auth.uid()));
create policy tenant_member on public.tenants for select to authenticated using (
  status = 'active' and exists (select 1 from public.memberships m where m.tenant_id = tenants.id and m.status = 'active')
);
create policy business_member on public.businesses for select to authenticated using (
  exists (select 1 from public.tenants t where t.id = businesses.tenant_id)
);
create policy branding_member on public.business_branding for select to authenticated using (
  exists (select 1 from public.businesses b where b.id = business_branding.business_id)
);

create function public.onboard_business(business_name text, business_category text, brand_color text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  workspace_id uuid;
  business_id uuid;
begin
  if actor is null then
    raise exception 'Sign in to create a business' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 0));
  select b.id into business_id
    from public.businesses b join public.tenants t on t.id = b.tenant_id
    where t.owner_user_id = actor and t.type = 'direct_business'
    order by b.created_at, b.id limit 1;
  if business_id is not null then
    return business_id;
  end if;

  insert into public.profiles(id)
    values (actor) on conflict (id) do nothing;
  insert into public.tenants(name,slug,owner_user_id)
    values (trim(business_name), 'workspace-' || gen_random_uuid()::text, actor)
    returning id into workspace_id;
  insert into public.memberships(tenant_id,user_id,role)
    values (workspace_id,actor,'owner');
  insert into public.businesses(tenant_id,name,category)
    values (workspace_id,trim(business_name),business_category)
    returning id into business_id;
  insert into public.business_branding(business_id,primary_color)
    values (business_id,brand_color);
  return business_id;
end;
$$;
revoke all on function public.onboard_business(text,text,text) from public, anon, authenticated;
grant execute on function public.onboard_business(text,text,text) to authenticated;
commit;
