alter table public.user_city_preferences
add column if not exists sort_order integer;

with ordered_preferences as (
  select
    id,
    row_number() over (
      partition by user_id
      order by created_at asc, city_id asc
    ) - 1 as next_sort_order
  from public.user_city_preferences
)
update public.user_city_preferences as preferences
set sort_order = ordered_preferences.next_sort_order
from ordered_preferences
where preferences.id = ordered_preferences.id
  and (
    preferences.sort_order is null
    or preferences.sort_order <> ordered_preferences.next_sort_order
  );

update public.user_city_preferences
set sort_order = 0
where sort_order is null;

alter table public.user_city_preferences
alter column sort_order set default 0;

alter table public.user_city_preferences
alter column sort_order set not null;

create index if not exists user_city_preferences_user_order_idx
on public.user_city_preferences (user_id, sort_order, created_at);

drop policy if exists "users can update their favorite cities" on public.user_city_preferences;
create policy "users can update their favorite cities"
on public.user_city_preferences
for update
to authenticated
using ((select auth.jwt()->>'sub') = user_id)
with check ((select auth.jwt()->>'sub') = user_id);
