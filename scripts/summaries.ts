// Hand-run: npm run summaries [-- --site <id>] [-- --template-only]
// Writes data/summaries.json. Reads ANTHROPIC_API_KEY from .env.local (never committed).
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "node:fs";
import { SITES, getSite } from "../lib/sites";
import { computeFacts } from "../lib/facts";
import { hasAdminKey, pushSummaries } from "../lib/db-admin";
import { generateSummary } from "../lib/summary-gen";
import type { SummariesFile } from "../lib/summary";
import type { SightingsFile } from "../lib/sightings";
import sightingsData from "../data/sightings.json";
import existing from "../data/summaries.json";

const OUT = new URL("../data/summaries.json", import.meta.url);

const args = process.argv.slice(2);
const templateOnly = args.includes("--template-only");
const siteArg = args.includes("--site") ? args[args.indexOf("--site") + 1] : undefined;

const file = sightingsData as SightingsFile;
const allNames = [...new Set(file.sightings.flatMap((s) => [s.scientificName, s.commonName ?? ""]))].filter(Boolean);

async function main() {
  const sites = siteArg ? [getSite(siteArg)].filter((s) => s !== undefined) : SITES;
  if (sites.length === 0) throw new Error(`Unknown site id: ${siteArg}`);

  let client: Anthropic | null = null;
  if (!templateOnly) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY missing. Add it to .env.local, or use --template-only.");
    }
    client = new Anthropic();
  }

  const out: SummariesFile = { summaries: { ...(existing as SummariesFile).summaries } };
  const rows: { id: string; source: string; text: string }[] = [];

  for (const site of sites) {
    const summary = await generateSummary(client, site, computeFacts(site.id, file), allNames);
    out.summaries[site.id] = summary;
    rows.push({ id: site.id, source: summary.source, text: summary.text });
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${rows.length} summar${rows.length === 1 ? "y" : "ies"} to data/summaries.json\n`);
  for (const r of rows) console.log(`${r.id}\n  [${r.source}] ${r.text}\n`);
  if (hasAdminKey()) console.log(`Database: ${await pushSummaries(out.summaries)} summaries saved.`);
  else console.log("Database not updated (no SUPABASE_SERVICE_ROLE_KEY). Run npm run db:seed after adding it.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
