-- Vytvoří tabulku pokud neexistuje, včetně sloupce items
create table if not exists public.vehicle_service (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid not null references public.vehicle(id) on delete cascade,
  service_date date not null,
  notes text,
  items text[] not null default '{}',
  created_at timestamptz default now()
);

-- Přidá items sloupec pokud tabulka existovala bez něj
alter table public.vehicle_service add column if not exists items text[] not null default '{}';

alter table public.vehicle_service enable row level security;

-- Policies (CREATE OR REPLACE není podporováno, proto DROP IF EXISTS)
drop policy if exists "Authenticated users can read vehicle service records" on public.vehicle_service;
drop policy if exists "Authenticated users can insert vehicle service records" on public.vehicle_service;
drop policy if exists "Authenticated users can update vehicle service records" on public.vehicle_service;
drop policy if exists "Authenticated users can delete vehicle service records" on public.vehicle_service;

create policy "Authenticated users can read vehicle service records"
  on public.vehicle_service for select to authenticated using (true);

create policy "Authenticated users can insert vehicle service records"
  on public.vehicle_service for insert to authenticated with check (true);

create policy "Authenticated users can update vehicle service records"
  on public.vehicle_service for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete vehicle service records"
  on public.vehicle_service for delete to authenticated using (true);
