create policy "Authenticated users can update vehicle service records"
  on public.vehicle_service for update to authenticated using (true) with check (true);
