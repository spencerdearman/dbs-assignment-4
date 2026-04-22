alter table public.worker_status
add column if not exists consecutive_error_count integer;

update public.worker_status
set consecutive_error_count = 0
where consecutive_error_count is null;

alter table public.worker_status
alter column consecutive_error_count set default 0;

alter table public.worker_status
alter column consecutive_error_count set not null;
