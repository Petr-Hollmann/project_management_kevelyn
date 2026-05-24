alter table public.vehicle_service add column if not exists items text[] not null default '{}';
