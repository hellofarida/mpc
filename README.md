# MPC guide (prototype)

A mobile web guide to the Melbourne Pollinator Corridor's 8 main sites, built on the MPC iNaturalist project. A Le Wagon project: a prototype, not an official Heartscapes service.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL, publishable key and (server-only) Anthropic API key.
3. In Supabase: **SQL Editor → New query**, paste `supabase/migrations/001_checkins_and_events.sql`, **Run**.
4. Then run `supabase/migrations/002_content_tables.sql` the same way (gardens, sightings, summaries tables, public read-only), add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (Supabase > Project settings > API; a secret, never `NEXT_PUBLIC_`, never in the browser) and run `npm run db:seed` once to load the saved files.
5. Phase 2: run `supabase/migrations/003_checkin_details_and_analytics.sql` the same way **before deploying the Phase 2 code** (events now carry a session id and placement, and the app calls `checkin_details`).
6. Phase 2, frustration logging: run `supabase/migrations/004_frustration_events.sql` the same way **before deploying that code** (events gain `detail` and `value` columns; without it, no events save).
7. Walks of up to 8 stops: run `supabase/migrations/005_walks_up_to_8_stops.sql` the same way **before deploying that code**.
8. `npm run test:db` checks the database rules with the public key (all lines should say PASS).
9. `npm run dev`

## Data
The app reads gardens, sightings and summaries from the database (public read-only tables). The files in `data/` are the seed and the offline fallback (used for a minute if the database can't be reached) and the fixtures for the tests. `npm run sightings` and `npm run summaries` write the files and, when `SUPABASE_SERVICE_ROLE_KEY` is set, the database too.

- `data/sites.json`: the 8 main sites from Heartscapes' PDF (Nov 2025). Addresses marked `approx` need checking on the map.
- `npm run sightings`: re-saves the last 12 months of MPC iNaturalist sightings within ~100 m of each address to `data/sightings.json`. Re-run before a demo.
  Observations are CC BY-NC: always credit the observer, link to the original, don't re-host photos, don't train AI on them.

## Weekly refresh
`npm run refresh` fetches new sightings, saves them to the database and rewrites the summary of any garden whose sightings changed (AI words it, code checks it, template fallback). `-- --dry-run` only looks; `-- --no-ai` uses templates. It also runs by itself every Monday morning (Melbourne) on GitHub Actions (`.github/workflows/weekly-refresh.yml`; you can also run it from the Actions tab). Add three repository secrets first (GitHub: Settings > Secrets and variables > Actions): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. The site picks up new data within the hour. A failed run emails you from GitHub.

## Fuller check-in and analytics (Phase 2)
- After the one-tap check-in, visitors may pick a favourite garden and add a one-line comment. It is **on in development and off in production** until Heartscapes agree who owns this data and how long it's kept: set `NEXT_PUBLIC_FULL_CHECKIN=on` and redeploy to switch it on (`lib/flags.ts`). Comments can't be read by visitors, never reach the chatbot, and the database rejects emails, links and phone numbers.
- Analytics are our own anonymous events (no cookies, no third-party script): each visit gets a random id kept only in the browser tab. Join and Volunteer links carry UTM tags (`utm_content` = which button, `utm_term` = which garden).
- Events are **batched**: the browser keeps them in a small queue and sends them in one request (at most every 10 s, or when 10 are waiting, or when the tab closes), with a cap of 60 per visit and repeats within 3 s ignored (`lib/events.ts`). Frustration signals (repeated taps, errors, slow answers, quick panel closes, cancelled leave box, abandoned plans, empty searches, declined questions) are detected in `components/tracker.tsx` and the components themselves; they log only fixed codes, never text or screen positions.
- `npm run analytics:prune [-- --days 90] [-- --yes]` deletes raw events older than N days (counts only without `--yes`). Run the report first.
- `npm run analytics:report [-- --since 2026-12-01] [-- --open]` writes a self-contained chart page, `reports/analytics.html` (gitignored, stays on your computer): pilot targets, journey funnel, where visits ended, possible friction, common paths, timing, per-garden figures, visits by day and hour, check-ins. No device ids or comment text. Needs the service key.
- `npm run analytics [-- --since 2026-12-01] [-- --comments]` prints the pilot numbers (visits, garden opens, Log/Join taps, check-ins, estimated arrivals, favourite gardens) against the PRD targets. Needs the service key.

## Clean-up
`npm run test:db` adds a test check-in and test events from device `00000000-0000-4000-8000-000000007e57`. Remove them in the SQL Editor:

```sql
delete from public.checkins where device_id = '00000000-0000-4000-8000-000000007e57';
delete from public.events   where device_id = '00000000-0000-4000-8000-000000007e57';
```

After the user test, delete raw events by hand and keep only totals.
