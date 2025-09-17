-- Ensure pgcrypto for gen_random_uuid
create extension if not exists pgcrypto;

-- Profiles table mapped to auth.users
create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    name text,
    email text unique,
    role text check (role in ('user','artisan','official')) not null default 'user',
    state text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- RLS: users can read their own profile; public can read limited fields if needed
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles
for update
using (auth.uid() = user_id);

-- Optional: allow inserts only by server (edge functions) via service role; block client inserts
revoke insert on public.profiles from anon, authenticated;

-- Minimal products table for RLS example (full fields in Step 2)
create table if not exists public.products (
    product_id uuid primary key default gen_random_uuid(),
    artisan_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    images text[] default array[]::text[],
    category text,
    price numeric,
    stock int default 0,
    created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- RLS: artisans can manage only their own products
drop policy if exists "products_artisan_read" on public.products;
create policy "products_artisan_read"
on public.products
for select
using (true);

drop policy if exists "products_artisan_modify_own" on public.products;
create policy "products_artisan_modify_own"
on public.products
for all
using (auth.uid() = artisan_id)
with check (auth.uid() = artisan_id);

-- Analytics events minimal for officials read
create table if not exists public.analytics_events (
    event_id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    event_type text not null,
    metadata jsonb default '{}'::jsonb,
    timestamp timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- RLS: insert allowed to authenticated users for logging their own events
drop policy if exists "analytics_insert_self" on public.analytics_events;
create policy "analytics_insert_self"
on public.analytics_events
for insert
with check (auth.uid() = user_id);

-- RLS: select allowed only to officials
drop policy if exists "analytics_officials_select" on public.analytics_events;
create policy "analytics_officials_select"
on public.analytics_events
for select
using (
    exists (
        select 1 from public.profiles p
        where p.user_id = auth.uid() and p.role = 'official'
    )
);

-- Helpful indexes
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_products_artisan on public.products(artisan_id);
create index if not exists idx_analytics_user on public.analytics_events(user_id);


