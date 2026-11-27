-- MPC guide: a planned walk can now include all 8 main sites (it was 5). Run once in the Supabase SQL Editor, AFTER 001-004,
-- and BEFORE deploying the code that allows 8-stop walks (a walk_open event with 6+ stops would otherwise be refused, and
-- because events are sent in batches, the refusal would drop the other events in the same batch).
alter table public.events drop constraint if exists events_stops_check;
alter table public.events add constraint events_stops_check check (stops is null or cardinality(stops) between 2 and 8);
