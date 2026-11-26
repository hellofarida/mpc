-- MPC guide, Phase 1 step 1: move gardens, sightings and summaries from files into the database.
-- Run once in the Supabase dashboard (SQL Editor > New query > paste > Run), AFTER 001.
-- Then load the data with `npm run db:seed` (needs SUPABASE_SERVICE_ROLE_KEY in .env.local).
--
-- Security model:
--   * sites, sightings, summaries, corridor_meta are PUBLIC READ-ONLY: anon may select, never insert/update/delete.
--   * Only the server-side scripts (service role key, never in the browser) write to them.
--   * Observer names are already public on iNaturalist and are credited next to each sighting.
-- Also fixes: check-ins and events now reference the sites table (so new gardens need no SQL change),
-- and a walk event may have 2 to 5 stops (the app allows 5).

-- ---------- sites ----------
create table if not exists public.sites (
  id            text primary key,
  number        int  not null,
  name          text not null,
  suburb        text not null,
  gardens       int  not null,
  gardens_note  text,
  area_m2       int  not null,
  note          text,
  addresses     jsonb not null, -- [{label, lat, lng, approx?}]
  kind          text not null default 'main' check (kind in ('main', 'scattered'))
);

insert into public.sites (id, number, name, suburb, gardens, gardens_note, area_m2, note, addresses) values
  ('south-melbourne-bee-gardens', 1, 'South Melbourne BEE Gardens', 'South Melbourne', 13, null, 134, 'Neighbouring residents'' street gardens aren''t part of the corridor. Look for the MPC signs.', '[{"label": "Corner of Cobden St and Moray St", "lat": -37.83616, "lng": 144.96485}]'::jsonb),
  ('101-cobden-st', 2, '101 Cobden St', 'South Melbourne', 2, '2 gardens and a laneway', 30, 'Neighbouring residents'' street gardens aren''t part of the corridor. Look for the MPC signs.', '[{"label": "101 Cobden St, 99 Cobden St and the laneway in between", "lat": -37.83604, "lng": 144.96526, "approx": true}]'::jsonb),
  ('napier-st-gardens', 3, 'Napier St Gardens', 'South Melbourne', 5, null, 76, null, '[{"label": "299 Moray St, plus across the road", "lat": -37.83394, "lng": 144.96378, "approx": true}, {"label": "135 Napier St", "lat": -37.83613, "lng": 144.96351}, {"label": "161 Napier St", "lat": -37.83634, "lng": 144.96281}]'::jsonb),
  ('bank-st-1st-site', 4, 'Bank St 1st site', 'South Melbourne', 3, null, 42, null, '[{"label": "Corner of Bank St and Emerald Way", "lat": -37.83326, "lng": 144.96402}, {"label": "126 Bank St (Pet Grocer)", "lat": -37.83288, "lng": 144.96455}]'::jsonb),
  ('bank-st-2nd-site', 5, 'Bank St 2nd site', 'South Melbourne', 3, null, 201, 'The Park Towers Reserve garden is outside the fenced community garden.', '[{"label": "Foundry Site Park", "lat": -37.83526, "lng": 144.95954}, {"label": "Park Towers Reserve", "lat": -37.83519, "lng": 144.95824}, {"label": "246\u2013258 Bank St", "lat": -37.83482, "lng": 144.95771}]'::jsonb),
  ('st-martins-youth-arts-centre', 6, 'St Martins Youth Arts Centre', 'South Yarra', 10, null, 450, null, '[{"label": "20\u201336 St Martins Place (off St Martins Lane), South Yarra", "lat": -37.83521, "lng": 144.98152}]'::jsonb),
  ('melbourne-grammar-wadhurst', 7, 'Melbourne Grammar School – Wadhurst Entrance', 'Melbourne', 2, null, 8, 'Managed by Melbourne Grammar School. About 100 m from St Kilda Rd.', '[{"label": "Wadhurst Entrance, Domain Rd, South Yarra", "lat": -37.83315, "lng": 144.97401}]'::jsonb),
  ('port-melbourne-primary', 8, 'Port Melbourne Primary School', 'Port Melbourne', 5, null, 450, null, '[{"label": "Across the road from 25 Poolman St, Port Melbourne", "lat": -37.83628, "lng": 144.93158}]'::jsonb)
on conflict (id) do nothing;

-- ---------- sightings (a rolling 12-month window from the MPC iNaturalist project) ----------
create table if not exists public.sightings (
  id                bigint primary key, -- the iNaturalist observation id
  site_id           text not null references public.sites (id),
  url               text not null,
  observed_on       date not null,
  scientific_name   text not null,
  common_name       text,
  iconic_taxon      text,
  groups            text[] not null default '{}',
  observer          text not null,
  license           text,
  photo_url         text,
  photo_attribution text,
  photo_license     text,
  quality_grade     text not null default ''
);
create index if not exists sightings_site_date on public.sightings (site_id, observed_on desc);

-- ---------- summaries (one per site) ----------
create table if not exists public.summaries (
  site_id      text primary key references public.sites (id),
  text         text not null,
  source       text not null check (source in ('ai', 'template')),
  model        text,
  generated_at timestamptz not null,
  data_up_to   date not null
);

-- ---------- corridor_meta (one row: where the sightings came from and how fresh they are) ----------
create table if not exists public.corridor_meta (
  id         int primary key check (id = 1),
  source     text not null,
  fetched_at timestamptz not null,
  from_date  date not null,
  data_up_to date not null,
  radius_m   int not null
);

-- ---------- row level security: public read-only ----------
do $$
declare t text;
begin
  foreach t in array array['sites', 'sightings', 'summaries', 'corridor_meta'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t); -- the server-side scripts (secret key)
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- ---------- checkins and events now follow the sites table ----------
alter table public.checkins drop constraint if exists checkins_site_id_check;
alter table public.checkins drop constraint if exists checkins_site_id_fkey;
alter table public.checkins add constraint checkins_site_id_fkey foreign key (site_id) references public.sites (id);

alter table public.events drop constraint if exists events_site_id_check;
alter table public.events drop constraint if exists events_site_id_fkey;
alter table public.events add constraint events_site_id_fkey foreign key (site_id) references public.sites (id);

alter table public.events drop constraint if exists events_stops_check;
alter table public.events add constraint events_stops_check check (stops is null or cardinality(stops) between 2 and 5);

-- The old hard-coded list is no longer used by any rule; keep the helper but read it from the table.
create or replace function public.mpc_site_ids()
returns text[]
language sql stable
set search_path = ''
as $$ select coalesce(array_agg(id order by number), '{}') from public.sites $$;
