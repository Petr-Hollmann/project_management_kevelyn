create table if not exists public.vehicle_service (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid not null references public.vehicle(id) on delete cascade,
  service_date date not null,
  notes text,
  created_at timestamptz default now()
);

alter table public.vehicle_service enable row level security;

create policy "Authenticated users can read vehicle service records"
  on public.vehicle_service for select to authenticated using (true);

create policy "Authenticated users can insert vehicle service records"
  on public.vehicle_service for insert to authenticated with check (true);

create policy "Authenticated users can delete vehicle service records"
  on public.vehicle_service for delete to authenticated using (true);
