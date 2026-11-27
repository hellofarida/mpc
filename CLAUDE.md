# MPC – Melbourne Pollinator Corridor guide

A mobile web guide to the Melbourne Pollinator Corridor's gardens (Heartscapes' project), powered by the MPC iNaturalist project, with an AI garden summary and an "Ask about this garden" chatbot. A Le Wagon project: a **2-day MVP built by one person**.

## Source documents (the source of truth; read before building)
They live in the Obsidian vault, not in this repo. Update them there, rather than copying them here.
- PRD: `/Users/farida/Documents/Nonsense Container/Lewagon/MPC - Melbourne Pollinator Corridor/Product Requirements Document.md`
- Tech stack: `…/MPC - Melbourne Pollinator Corridor/Tech stack.md`
- Roadmap (Phases 0–4, 1 day a week after the MVP): `…/MPC - Melbourne Pollinator Corridor/WIP Roadmap.md`
- Production readiness: `…/MPC - Melbourne Pollinator Corridor/Production readiness.md`
- Diagram screenshots: `…/MPC - Melbourne Pollinator Corridor/attachments/`
- Vault hub: `/Users/farida/Documents/Nonsense Container/Lewagon/Lewagon.md`
- Flow diagram (Whimsical): https://whimsical.com/Vfuj36gzTJBeMNxXkZHXgz — the visitor-journey swimlane (Data, Visitor, App, Guardrails, AI) plus the garden summary pipeline. Re-export the PRD screenshots when it changes, flattened onto white (`magick in.png -background white -alpha remove -alpha off out.png`).

## Golden path
**User story:** As a nature enthusiast, I want to easily see a summary of the sites of the Melbourne Pollinator Corridor and create a route I can open in my maps app, so that I can visit more of the gardens in one trip and know what to look for at each.

**Steps:** open the link or scan a QR code → map → nearest site → garden page (AI summary + recent sightings) → check in ("I'm here!") → optionally ask a question → Plan my walk (tick 2–4 sites) → open the walk in Google Maps (Apple Maps: first stop) → check in at each stop → log a sighting / join or volunteer.

## MVP scope (8 items)
1. **Map:** the 8 main sites as pins (Leaflet + OpenStreetMap tiles, credited), with "you are here". One pin per site.
2. **Garden page:** address, Directions button (Google/Apple Maps), recent sightings from the saved file with photo, name, date, **observer credit** and a "data up to" date, plus the AI summary.
3. **Log a sighting:** opens iNaturalist (sightings land in the MPC project).
4. **Join / Volunteer:** links to Heartscapes, tagged.
5. **Per-garden chatbot:** question → input validation → AI call 1 picks one of **3 read-only lookups** (strict tool schema) → code runs it → AI call 2 writes the answer as JSON → format + number check → show with source; any failure → **template fallback**. Out-of-scope questions are declined (e.g. photo ID → iNaturalist).
6. **Minimal check-in:** "How did you get here today?" Walked / Cycled / Ran / Other. One tap, no typing; repeat taps from the same device within an hour are ignored.
7. **Step events:** `page_open`, `garden_view`, `question`, `log_tap`, `join_tap`, `directions_tap`, `walk_open`, with an anonymous random device ID (no name, email or location).
8. **Plan my walk:** tick 2–4 sites → one Google Maps URL (`https://www.google.com/maps/dir/?api=1&travelmode=walking`, origin = the visitor's location if shared, last site = `destination`, the others = `waypoints`, coordinates only). Stops are sorted west → east. Apple Maps officially supports only two points, so it opens directions to the first stop. Test with 4 stops on Android and iPhone.

**Out of scope for the MVP:** the 14 scattered gardens, a route line on our own map, saved walks, live iNaturalist fetching, accounts, AI species ID, native apps, polished design, full analytics, server-side rate limits.

## The 8 main sites (Heartscapes' PDF, Nov 2025; 43 of the 57 gardens)
| # | Site | Suburb | Address |
|---|---|---|---|
| 1 | South Melbourne BEE Gardens | South Melbourne | Corner of Cobden St and Moray St |
| 2 | 101 Cobden St | South Melbourne | 101 Cobden St, 99 Cobden St and the laneway in between |
| 3 | Napier St Gardens | South Melbourne | 299 Moray St plus across the road, 135 Napier St, 161 Napier St |
| 4 | Bank St 1st site | South Melbourne | Corner Bank St and Emerald Way, 126 Bank St (Pet Grocer) |
| 5 | Bank St 2nd site | South Melbourne | Foundry Site Park, Park Towers Reserve and 246–258 Bank St |
| 6 | St Martins Youth Arts Centre | South Yarra | 20–36 St Martins Place (off St Martins Lane) |
| 7 | Melbourne Grammar School – Wadhurst Entrance | Melbourne | Wadhurst Entrance, Domain Rd, South Yarra |
| 8 | Port Melbourne Primary School | Port Melbourne | Across the road from 25 Poolman St |

Sites 1 and 2 sit among residents' own street gardens that aren't part of the MPC: make clear which gardens belong to the corridor.

## Stack (see Tech stack.md)
- Next.js (App Router) + Tailwind + shadcn/ui (the same patterns as the Job Tracker: https://github.com/hellofarida/job-tracker), react-leaflet loaded client-only.
- Data: JSON files for the sites, the saved sightings and the AI summaries. Supabase holds `checkins` and `events` (insert-only for anonymous users via RLS) and, from Phase 1, the content tables `sites`, `sightings`, `summaries`, `corridor_meta` (public read-only; written only by scripts with the service role key). `data/*.json` is the seed, offline fallback and test fixture.
- iNaturalist API v1: about 60 requests a minute, send a descriptive User-Agent, cache. Observations are **CC BY-NC**: always credit the observer, don't re-host photos, don't train AI on the data.
- Claude API (`@anthropic-ai/sdk`), **server-side only**, key never `NEXT_PUBLIC_`. Default model `claude-opus-5-5` (low effort for summaries, medium for the chatbot). Haiku 5.5 is the cheaper option, only after re-running the spot check.
- Summaries: a hand-run script (`npm run summaries`): fetch → match to sites (~100 m) → fact sheet → AI writes 1–2 sentences → number check → template fallback → `summaries.json`. All 8 are checked by hand before a demo.
- Hosting: Vercel Hobby. Set a monthly spend limit in the Claude Console.

## Principles
- **AI is the translator, not the source of truth:** code calculates every number, the AI only writes the words, and code checks them before anyone sees them. There is always a template fallback, and AI text is labelled "written by AI".
- Top 3 guardrails: input validation, format/number check, fallback to a simpler rule.
- Nothing personal is sent to the AI or stored. Location stays on the phone.
- Never put secrets in code. Keep `.env.local` gitignored.

## 2-day build plan (no spare time left)
- **Day 1, morning:** sites JSON + coordinates, the sightings script, the Supabase tables, the device ID and a `logEvent` helper.
- **Day 1, afternoon:** map, garden pages with the Directions/Log/Join links, the check-in card, Plan my walk.
- **Day 2, morning:** shared counting functions, the summary script with its checks, AI labels, testing the walk link.
- **Day 2, afternoon:** the per-garden chatbot, then a 3–5 person test (app vs the PDF).
- **If time runs short, cut in this order:** phone polish → the "you are here" dot → the chatbot's check-in lookup.

## KPIs
1. Time to find a garden and what lives there (vs the PDF, target under 30 s).
2. Drop-off along the golden path.
3. Directions/walk taps and arrivals. Arrivals are an *estimate*: a tap followed by a check-in from the same device.

AI KPIs: 100% of numbers correct on a 20-question set. Cost about $0.008 per summary and about $0.03 per chatbot answer, under $5 in total.

## Session length
- Flag it to the user every time a session is nearing 200k tokens of context, and suggest starting a new session (with a short hand-over summary) before it gets there.
