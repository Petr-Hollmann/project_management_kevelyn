-- Explicitní datum příštího servisu na vozidle (pro rychlý přístup)
alter table public.vehicle add column if not exists next_service_date date;

-- Datum příštího servisu i v historii (pro zachování kontextu záznamu)
alter table public.vehicle_service add column if not exists next_service_date date;
