/**
 * npm run sightings
 * Saves the last 12 months of MPC iNaturalist sightings to data/sightings.json (the seed and test fixture) and,
 * when SUPABASE_SERVICE_ROLE_KEY is set, to the database. The weekly refresh (npm run refresh) does this too.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasAdminKey, pushSightings } from "../lib/db-admin";
import { fetchSightings } from "../lib/inat";
import { SITES } from "../lib/sites";

async function main() {
  const file = await fetchSightings(SITES);
  writeFileSync(join(process.cwd(), "data", "sightings.json"), JSON.stringify(file, null, 1) + "\n");
  const perSite = SITES.map((s) => `${s.name}: ${file.sightings.filter((x) => x.siteId === s.id).length}`);
  console.log(`\nSaved ${file.sightings.length} sightings to data/sightings.json\n${perSite.join("\n")}`);
  if (hasAdminKey()) {
    const r = await pushSightings(file);
    console.log(`Database: ${r.saved} sightings saved, ${r.removed} removed.`);
  } else console.log("Database not updated (no SUPABASE_SERVICE_ROLE_KEY). Run npm run db:seed after adding it.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
