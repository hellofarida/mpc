// Hand-run: npm run db:seed. Loads the saved files (data/*.json) into the database, after 002_content_tables.sql.
// Safe to re-run: it upserts. Needs SUPABASE_SERVICE_ROLE_KEY in .env.local.
import { hasAdminKey, pushSightings, pushSites, pushSummaries } from "../lib/db-admin";
import type { SightingsFile } from "../lib/sightings";
import { SITES } from "../lib/sites";
import type { SummariesFile } from "../lib/summary";
import sightings from "../data/sightings.json";
import summaries from "../data/summaries.json";

async function main() {
  if (!hasAdminKey()) throw new Error("Add SUPABASE_SERVICE_ROLE_KEY to .env.local first (Supabase > Project settings > API).");
  console.log(`sites: ${await pushSites(SITES)}`);
  const s = await pushSightings(sightings as SightingsFile);
  console.log(`sightings: ${s.saved} saved, ${s.removed} removed`);
  console.log(`summaries: ${await pushSummaries((summaries as SummariesFile).summaries)}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
