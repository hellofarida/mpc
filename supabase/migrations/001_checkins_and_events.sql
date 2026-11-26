-- MPC guide: the only two tables, checkins and events.
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.
--
-- Security model (the publishable key is public, so these rules are the real lock):
--   * Visitors ("anon") can never read, edit or delete rows.
--   * events: anon may only INSERT, and only valid values (checked below).
--   * checkins: anon can't touch the table at all. Check-ins go through check_in(),
--     which ignores repeats from the same device at the same site within an hour.
--   * checkin_totals() returns totals only (never single rows), for the chatbot.
-- Nothing personal is stored: no name, email, location or free text.

-- The 8 main sites (must match data/sites.json).
create or replace function public.mpc_site_ids()
returns text[]
language sql immutable
as $$
  select array[
    'south-melbourne-bee-gardens', '101-cobden-st', 'napier-st-gardens', 'bank-st-1st-site',
    'bank-st-2nd-site', 'st-martins-youth-arts-centre', 'melbourne-grammar-wadhurst', 'port-melbourne-primary'
  ]
$$;

-- ---------- checkins ----------
create table public.checkins (
  id          bigint generated always as identity primary key,
  site_id     text not null check (site_id = any (public.mpc_site_ids())),
  mode        text not null check (mode in ('walked', 'cycled', 'ran', 'other')),
  device_id   uuid not null,
  is_test     boolean not null default false, -- demo check-ins, deleted before real use
  created_at  timestamptz not null default now()
);
create index checkins_site_time on public.checkins (site_id, created_at);
create index checkins_device_site_time on public.checkins (device_id, site_id, created_at);
alter table public.checkins enable row level security;
-- No policies and no grants for anon/authenticated: the table is closed to the API.
revoke all on table public.checkins from anon, authenticated;

-- ---------- events ----------
create table public.events (
  id          bigint generated always as identity primary key,
  event       text not null check (event in
                ('page_open', 'garden_view', 'question', 'log_tap', 'join_tap', 'directions_tap', 'walk_open')),
  site_id     text check (site_id is null or site_id = any (public.mpc_site_ids())),
  maps_app    text check (maps_app is null or maps_app in ('google', 'apple')),
  stops       text[] check (stops is null or (cardinality(stops) between 2 and 4 and stops <@ public.mpc_site_ids())),
  device_id   uuid not null,
  created_at  timestamptz not null default now()
);
create index events_event_time on public.events (event, created_at);
alter table public.events enable row level security;

revoke all on table public.events from anon, authenticated;
grant insert on table public.events to anon, authenticated;

create policy "visitors can add events only"
  on public.events for insert
  to anon, authenticated
  with check (true); -- column checks above validate every value

-- ---------- check_in(): one tap, repeats within an hour ignored ----------
create or replace function public.check_in(p_site_id text, p_mode text, p_device_id uuid)
returns boolean -- true = saved, false = ignored as a repeat
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.checkins
    where device_id = p_device_id and site_id = p_site_id and created_at > now() - interval '1 hour'
  ) then
    return false;
  end if;
  insert into public.checkins (site_id, mode, device_id) values (p_site_id, p_mode, p_device_id);
  return true;
end;
$$;
revoke all on function public.check_in(text, text, uuid) from public;
grant execute on function public.check_in(text, text, uuid) to anon, authenticated;

-- ---------- checkin_totals(): totals only, for the chatbot ----------
create or replace function public.checkin_totals(p_site_id text, p_from timestamptz, p_to timestamptz)
returns table (mode text, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.mode, count(*)::bigint
  from public.checkins c
  where c.site_id = p_site_id and c.created_at >= p_from and c.created_at < p_to
  group by c.mode
$$;
revoke all on function public.checkin_totals(text, timestamptz, timestamptz) from public;
grant execute on function public.checkin_totals(text, timestamptz, timestamptz) to anon, authenticated;
