create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.cities (
  id text primary key,
  name text not null,
  region text not null,
  country text not null default 'USA',
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null,
  is_featured boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.weather_snapshots (
  city_id text primary key references public.cities(id) on delete cascade,
  temperature_c double precision not null,
  apparent_temperature_c double precision not null,
  relative_humidity integer not null,
  precipitation_mm double precision not null default 0,
  wind_speed_kph double precision not null,
  weather_code integer not null,
  is_day boolean not null,
  observed_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_unit text not null default 'fahrenheit' check (preferred_unit in ('fahrenheit', 'celsius')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_city_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  city_id text not null references public.cities(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, city_id)
);

create table if not exists public.worker_status (
  id text primary key,
  source_name text not null,
  poll_interval_minutes integer not null default 15,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_weather_snapshots_updated_at on public.weather_snapshots;
create trigger set_weather_snapshots_updated_at
before update on public.weather_snapshots
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_worker_status_updated_at on public.worker_status;
create trigger set_worker_status_updated_at
before update on public.worker_status
for each row
execute function public.set_updated_at();

alter table public.cities enable row level security;
alter table public.weather_snapshots enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_city_preferences enable row level security;
alter table public.worker_status enable row level security;

drop policy if exists "cities are public readable" on public.cities;
create policy "cities are public readable"
on public.cities
for select
to anon, authenticated
using (true);

drop policy if exists "weather snapshots are public readable" on public.weather_snapshots;
create policy "weather snapshots are public readable"
on public.weather_snapshots
for select
to anon, authenticated
using (true);

drop policy if exists "worker status is public readable" on public.worker_status;
create policy "worker status is public readable"
on public.worker_status
for select
to anon, authenticated
using (true);

drop policy if exists "users can view their profile" on public.user_profiles;
create policy "users can view their profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert their profile" on public.user_profiles;
create policy "users can insert their profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update their profile" on public.user_profiles;
create policy "users can update their profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can view their favorite cities" on public.user_city_preferences;
create policy "users can view their favorite cities"
on public.user_city_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can add their favorite cities" on public.user_city_preferences;
create policy "users can add their favorite cities"
on public.user_city_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can delete their favorite cities" on public.user_city_preferences;
create policy "users can delete their favorite cities"
on public.user_city_preferences
for delete
to authenticated
using (auth.uid() = user_id);

insert into public.worker_status (
  id,
  source_name,
  poll_interval_minutes,
  last_error
)
values (
  'open-meteo-worker',
  'open-meteo',
  15,
  'Worker has not reported yet.'
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'weather_snapshots'
  ) then
    alter publication supabase_realtime add table public.weather_snapshots;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'worker_status'
  ) then
    alter publication supabase_realtime add table public.worker_status;
  end if;
end
$$;

