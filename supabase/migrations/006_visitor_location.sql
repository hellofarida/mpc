-- MPC guide, Phase 2 analytics: approximate visitor location. Run once in the Supabase SQL Editor, AFTER 001-005,
-- and BEFORE deploying the code that sends it (events are sent in batches, so a missing column would drop the batch).
--
-- What is stored, and only on the once-per-visit `visit_info` event:
--   country  two-letter country code, e.g. AU
--   region   state, only for Australia, e.g. VIC
--   city     city, only for Australia, e.g. Melbourne
-- It comes from the visitor's connection (the hosting provider's approximate lookup), NOT from their device location.
-- The address itself is never stored. Never a street, a suburb or coordinates. Outside Australia only the country is kept.

alter table public.events add column if not exists country text;
alter table public.events add column if not exists region text;
alter table public.events add column if not exists city text;

alter table public.events drop constraint if exists events_country_check;
alter table public.events add constraint events_country_check check (country is null or country ~ '^[A-Z]{2}$');
alter table public.events drop constraint if exists events_region_check;
alter table public.events add constraint events_region_check check (region is null or region ~ '^[A-Z0-9-]{1,8}$');
alter table public.events drop constraint if exists events_city_check;
alter table public.events add constraint events_city_check check (city is null or city ~ '^[[:alpha:]][[:alpha:] .''-]{0,59}$');

-- Location only on visit_info, and state and city only for Australia.
alter table public.events drop constraint if exists events_location_check;
alter table public.events add constraint events_location_check check (
  (country is null and region is null and city is null)
  or (event = 'visit_info' and country is not null and (country = 'AU' or (region is null and city is null)))
);
