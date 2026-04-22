alter table public.worker_status
add column if not exists consecutive_error_count integer;

alter table public.worker_status
enable row level security;

update public.worker_status
set consecutive_error_count = 0
where consecutive_error_count is null;

alter table public.worker_status
alter column consecutive_error_count set default 0;

alter table public.worker_status
alter column consecutive_error_count set not null;

drop policy if exists "worker status is public readable" on public.worker_status;
create policy "worker status is public readable"
on public.worker_status
for select
to anon, authenticated
using (true);

insert into public.worker_status (
  id,
  source_name,
  poll_interval_minutes,
  last_error,
  consecutive_error_count
)
values (
  'open-meteo-worker',
  'open-meteo',
  15,
  'Worker has not reported yet.',
  0
)
on conflict (id) do update
set
  source_name = excluded.source_name,
  poll_interval_minutes = excluded.poll_interval_minutes,
  consecutive_error_count = coalesce(public.worker_status.consecutive_error_count, 0);

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
