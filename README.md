# MPC guide (prototype)

A mobile web guide to the Melbourne Pollinator Corridor's 8 main sites, built on the MPC iNaturalist project. A Le Wagon project: a prototype, not an official Heartscapes service.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL, publishable key and (server-only) Anthropic API key.
3. In Supabase: **SQL Editor → New query**, paste `supabase/migrations/001_checkins_and_events.sql`, **Run**.
4. Then run `supabase/migrations/002_content_tables.sql` the same way (gardens, sightings, summaries tables, public read-only), add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (Supabase > Project settings > API; a secret, never `NEXT_PUBLIC_`, never in the browser) and run `npm run db:seed` once to load the saved files.
5. `npm run test:db` checks the database rules with the public key (all lines should say PASS).
6. `npm run dev`

## Data
The app reads gardens, sightings and summaries from the database (public read-only tables). The files in `data/` are the seed and the offline fallback (used for a minute if the database can't be reached) and the fixtures for the tests. `npm run sightings` and `npm run summaries` write the files and, when `SUPABASE_SERVICE_ROLE_KEY` is set, the database too.

- `data/sites.json`: the 8 main sites from Heartscapes' PDF (Nov 2025). Addresses marked `approx` need checking on the map.
- `npm run sightings`: re-saves the last 12 months of MPC iNaturalist sightings within ~100 m of each address to `data/sightings.json`. Re-run before a demo.
  Observations are CC BY-NC: always credit the observer, link to the original, don't re-host photos, don't train AI on them.

## Weekly refresh
`npm run refresh` fetches new sightings, saves them to the database and rewrites the summary of any garden whose sightings changed (AI words it, code checks it, template fallback). `-- --dry-run` only looks; `-- --no-ai` uses templates. It also runs by itself every Monday morning (Melbourne) on GitHub Actions (`.github/workflows/weekly-refresh.yml`; you can also run it from the Actions tab). Add three repository secrets first (GitHub: Settings > Secrets and variables > Actions): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. The site picks up new data within the hour. A failed run emails you from GitHub.

## Clean-up
`npm run test:db` adds a test check-in and test events from device `00000000-0000-4000-8000-000000007e57`. Remove them in the SQL Editor:

```sql
delete from public.checkins where device_id = '00000000-0000-4000-8000-000000007e57';
delete from public.events   where device_id = '00000000-0000-4000-8000-000000007e57';
```

After the user test, delete raw events by hand and keep only totals.
