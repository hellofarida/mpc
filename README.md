# MPC guide (prototype)

A mobile web guide to the Melbourne Pollinator Corridor's 8 main sites, built on the MPC iNaturalist project. A Le Wagon project: a prototype, not an official Heartscapes service.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL, publishable key and (server-only) Anthropic API key.
3. In Supabase: **SQL Editor → New query**, paste `supabase/migrations/001_checkins_and_events.sql`, **Run**.
4. `npm run test:db` checks the database rules with the public key (all lines should say PASS).
5. `npm run dev`

## Data
- `data/sites.json`: the 8 main sites from Heartscapes' PDF (Nov 2025). Addresses marked `approx` need checking on the map.
- `npm run sightings`: re-saves the last 12 months of MPC iNaturalist sightings within ~100 m of each address to `data/sightings.json`. Re-run before a demo.
  Observations are CC BY-NC: always credit the observer, link to the original, don't re-host photos, don't train AI on them.

## Clean-up
`npm run test:db` adds a test check-in and test events from device `00000000-0000-4000-8000-000000007e57`. Remove them in the SQL Editor:

```sql
delete from public.checkins where device_id = '00000000-0000-4000-8000-000000007e57';
delete from public.events   where device_id = '00000000-0000-4000-8000-000000007e57';
```

After the user test, delete raw events by hand and keep only totals.
