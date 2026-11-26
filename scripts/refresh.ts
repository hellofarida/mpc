/**
 * The weekly refresh. Runs on GitHub Actions every Monday morning (Melbourne), or by hand:
 *   npm run refresh                  fetch, save, re-write summaries for gardens whose sightings changed
 *   npm run refresh -- --dry-run     fetch and compare only; writes nothing, makes no AI calls
 *   npm run refresh -- --no-ai       summaries come from the template (no ANTHROPIC_API_KEY needed)
 *
 * Steps: read the gardens from the database -> fetch the last 12 months from iNaturalist -> safety check ->
 * save sightings -> for each garden that changed (or has no summary) write a new summary: the AI words it,
 * code checks every number and name, a template is used if the checks fail. Gardens that didn't change are
 * left alone (no AI cost). The website picks up the new data within the hour (its cache expires).
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (and ANTHROPIC_API_KEY unless --no-ai).
 */
import Anthropic from "@anthropic-ai/sdk";
import { hasAdminKey, pushSightings, pushSummaries, readSightingIds, readSites, readSummaries } from "../lib/db-admin";
import { computeFacts } from "../lib/facts";
import { fetchSightings } from "../lib/inat";
import { generateSummary } from "../lib/summary-gen";
import type { Summary } from "../lib/summary";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noAi = args.includes("--no-ai");

const same = (a: Set<number> | undefined, b: Set<number>) =>
  !!a && a.size === b.size && [...b].every((id) => a.has(id));

async function main() {
  if (!hasAdminKey()) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  if (!dryRun && !noAi && !process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is missing (or use --no-ai).");

  const sites = await readSites();
  const before = await readSightingIds();
  const beforeTotal = [...before.values()].reduce((n, s) => n + s.size, 0);
  console.log(`Gardens: ${sites.length}. Sightings saved now: ${beforeTotal}.`);

  const file = await fetchSightings(sites);
  const total = file.sightings.length;
  console.log(`Fetched ${total} sightings (up to ${file.dataUpTo}).`);

  // Safety: an iNaturalist outage or partial fetch must never wipe the saved sightings.
  if (total === 0 && beforeTotal > 0) throw new Error("Fetched 0 sightings but some are saved. Not writing anything.");
  if (beforeTotal >= 20 && total < beforeTotal * 0.5) {
    throw new Error(`Fetched ${total}, fewer than half of the ${beforeTotal} saved. Looks incomplete. Not writing anything.`);
  }

  const bySite = new Map<string, Set<number>>();
  for (const s of file.sightings) {
    if (!bySite.has(s.siteId)) bySite.set(s.siteId, new Set());
    bySite.get(s.siteId)!.add(s.id);
  }
  const existing = await readSummaries();
  const todo = sites.filter((s) => !same(before.get(s.id) ?? new Set(), bySite.get(s.id) ?? new Set()) || !existing[s.id]);
  console.log(`Gardens to re-summarise: ${todo.length ? todo.map((s) => s.name).join(", ") : "none"}.`);

  if (dryRun) {
    console.log("Dry run: nothing written.");
    return;
  }

  const saved = await pushSightings(file);
  console.log(`Saved ${saved.saved} sightings, removed ${saved.removed}.`);

  if (todo.length > 0) {
    const client = noAi ? null : new Anthropic();
    const allNames = [...new Set(file.sightings.flatMap((s) => [s.scientificName, s.commonName ?? ""]))].filter(Boolean);
    const fresh: Record<string, Summary> = {};
    let templates = 0;
    for (const site of todo) {
      fresh[site.id] = await generateSummary(client, site, computeFacts(site.id, file), allNames, (m) => console.warn(m));
      if (fresh[site.id].source === "template") templates++;
      console.log(`  [${fresh[site.id].source}] ${site.name}: ${fresh[site.id].text}`);
    }
    await pushSummaries(fresh);
    console.log(`Saved ${todo.length} summaries (${templates} from the template${noAi ? ", AI off" : ""}).`);
    if (!noAi && templates > 0) console.warn("Some summaries fell back to the template: the AI's text failed the checks.");
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
