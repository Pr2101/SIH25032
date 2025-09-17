-- Core tables extension of Step 1 (hosted-compatible)
create extension if not exists pgcrypto;

-- artisans — artisan_id (FK user), display_name, address, lat, lon, skills (tags), story, verified_status, contact_info, created_at
create table if not exists public.artisans (
    artisan_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    address text,
    lat double precision,
    lon double precision,
    skills text[] default array[]::text[],
    story text,
    verified_status text check (verified_status in ('pending','verified','rejected')) not null default 'pending',
    contact_info jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);
alter table public.artisans enable row level security;
drop policy if exists "artisans_self_read" on public.artisans;
create policy "artisans_self_read" on public.artisans for select using (true);
drop policy if exists "artisans_self_modify" on public.artisans;
create policy "artisans_self_modify" on public.artisans for update using (auth.uid() = artisan_id);
drop policy if exists "artisans_official_verify" on public.artisans;
create policy "artisans_official_verify" on public.artisans for update using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'official')
);

create index if not exists idx_artisans_status on public.artisans(verified_status);

-- places — place_id, name, state, type, coords, short_desc, long_desc, images[], tags
create table if not exists public.places (
    place_id uuid primary key default gen_random_uuid(),
    name text not null,
    state text not null,
    type text check (type in ('nature','historical','cultural')),
    lat double precision,
    lon double precision,
    short_desc text,
    long_desc text,
    images text[] default array[]::text[],
    tags text[] default array[]::text[]
);
alter table public.places enable row level security;
drop policy if exists "places_read_all" on public.places;
create policy "places_read_all" on public.places for select using (true);
-- restrict writes to officials (or service role)
drop policy if exists "places_write_officials" on public.places;
create policy "places_write_officials" on public.places for all using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'official')
);
create index if not exists idx_places_state on public.places(state);
create unique index if not exists ux_places_name_state on public.places(lower(name), lower(state));

-- festivals — festival_id, place_id/state, date or recurring pattern, desc, long_desc, video_360_link
create table if not exists public.festivals (
    festival_id uuid primary key default gen_random_uuid(),
    place_id uuid references public.places(place_id) on delete set null,
    state text,
    date date,
    date_pattern text,
    short_desc text,
    long_desc text,
    video_360_link text,
    created_at timestamptz not null default now()
);
alter table public.festivals enable row level security;
drop policy if exists "festivals_read_all" on public.festivals;
create policy "festivals_read_all" on public.festivals for select using (true);
drop policy if exists "festivals_write_officials" on public.festivals;
create policy "festivals_write_officials" on public.festivals for all using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'official')
);
create index if not exists idx_festivals_state on public.festivals(state);

-- products — extend minimal fields if missing
alter table public.products add column if not exists category text;
alter table public.products add column if not exists images text[] default array[]::text[];

-- chats — chat_id, user_id, role, prompt, gemini_response, session_id, timestamp
create table if not exists public.chats (
    chat_id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    role text,
    prompt text,
    gemini_response text,
    session_id text,
    timestamp timestamptz not null default now()
);
alter table public.chats enable row level security;
drop policy if exists "chats_user_read" on public.chats;
create policy "chats_user_read" on public.chats for select using (auth.uid() = user_id);
drop policy if exists "chats_user_write" on public.chats;
create policy "chats_user_write" on public.chats for insert with check (auth.uid() = user_id);

-- reviews — review_id, reviewer_id, target_type, target_id, rating, comment, created_at
create table if not exists public.reviews (
    review_id uuid primary key default gen_random_uuid(),
    reviewer_id uuid references auth.users(id) on delete cascade,
    target_type text check (target_type in ('place','product','artisan')) not null,
    target_id uuid not null,
    rating int check (rating between 1 and 5) not null,
    comment text,
    created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
drop policy if exists "reviews_read_all" on public.reviews;
create policy "reviews_read_all" on public.reviews for select using (true);
drop policy if exists "reviews_user_insert" on public.reviews;
create policy "reviews_user_insert" on public.reviews for insert with check (auth.uid() = reviewer_id);
drop policy if exists "reviews_user_update_own" on public.reviews;
create policy "reviews_user_update_own" on public.reviews for update using (auth.uid() = reviewer_id);

-- wishlists — user_id, [place_ids], [product_ids]
create table if not exists public.wishlists (
    user_id uuid primary key references auth.users(id) on delete cascade,
    place_ids uuid[] default array[]::uuid[],
    product_ids uuid[] default array[]::uuid[]
);
alter table public.wishlists enable row level security;
drop policy if exists "wishlists_user_rw" on public.wishlists;
create policy "wishlists_user_rw" on public.wishlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reports — report_id, official_id, period, gemini_summary_link, generated_at
create table if not exists public.reports (
    report_id uuid primary key default gen_random_uuid(),
    official_id uuid references auth.users(id) on delete set null,
    period text not null,
    gemini_summary_link text,
    generated_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports_officials_rw" on public.reports;
create policy "reports_officials_rw" on public.reports for all using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'official')
);

-- Helpful indexes
create index if not exists idx_reviews_target on public.reviews(target_type, target_id);
create index if not exists idx_chats_user on public.chats(user_id);


