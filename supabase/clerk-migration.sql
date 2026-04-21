drop policy if exists "users can view their profile" on public.user_profiles;
drop policy if exists "users can insert their profile" on public.user_profiles;
drop policy if exists "users can update their profile" on public.user_profiles;
drop policy if exists "users can view their favorite cities" on public.user_city_preferences;
drop policy if exists "users can add their favorite cities" on public.user_city_preferences;
drop policy if exists "users can delete their favorite cities" on public.user_city_preferences;

alter table public.user_profiles
  drop constraint if exists user_profiles_user_id_fkey;

alter table public.user_city_preferences
  drop constraint if exists user_city_preferences_user_id_fkey;

alter table public.user_profiles
  alter column user_id type text using user_id::text,
  alter column user_id set default (auth.jwt()->>'sub');

alter table public.user_city_preferences
  alter column user_id type text using user_id::text,
  alter column user_id set default (auth.jwt()->>'sub');

create policy "users can view their profile"
on public.user_profiles
for select
to authenticated
using ((select auth.jwt()->>'sub') = user_id);

create policy "users can insert their profile"
on public.user_profiles
for insert
to authenticated
with check ((select auth.jwt()->>'sub') = user_id);

create policy "users can update their profile"
on public.user_profiles
for update
to authenticated
using ((select auth.jwt()->>'sub') = user_id)
with check ((select auth.jwt()->>'sub') = user_id);

create policy "users can view their favorite cities"
on public.user_city_preferences
for select
to authenticated
using ((select auth.jwt()->>'sub') = user_id);

create policy "users can add their favorite cities"
on public.user_city_preferences
for insert
to authenticated
with check ((select auth.jwt()->>'sub') = user_id);

create policy "users can delete their favorite cities"
on public.user_city_preferences
for delete
to authenticated
using ((select auth.jwt()->>'sub') = user_id);
