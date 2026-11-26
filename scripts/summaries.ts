// Hand-run: npm run summaries [-- --site <id>] [-- --template-only]
// Writes data/summaries.json. Reads ANTHROPIC_API_KEY from .env.local (never committed).
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "node:fs";
import { SITES, getSite } from "../lib/sites";
import { computeFacts } from "../lib/facts";
import { hasAdminKey, pushSummaries } from "../lib/db-admin";
import { checkSummary, factSheet, templateSummary, type Summary, type SummariesFile } from "../lib/summary";
import type { SightingsFile } from "../lib/sightings";
import sightingsData from "../data/sightings.json";
import existing from "../data/summaries.json";

const MODEL = "claude-opus-5-5";
const MAX_ATTEMPTS = 2; // hard cap per site: one try plus one retry
const OUT = new URL("../data/summaries.json", import.meta.url);

const args = process.argv.slice(2);
const templateOnly = args.includes("--template-only");
const siteArg = args.includes("--site") ? args[args.indexOf("--site") + 1] : undefined;

const file = sightingsData as SightingsFile;
const allNames = [...new Set(file.sightings.flatMap((s) => [s.scientificName, s.commonName ?? ""]))].filter(Boolean);

const SYSTEM = `You write a short summary of the sightings recorded at one pollinator garden, for visitors to a mobile guide.
Rules:
- Write 1 or 2 sentences, at most 300 characters, in plain friendly English.
- Use ONLY the facts in the fact sheet. Every number you write must appear in the fact sheet.
- Do not mention any species, group or place that the fact sheet does not list.
- No advice, no suggestions, no recommendations, no "you should", no best times to visit.
- Do not say anything about the Heartscapes organisation or who runs the garden.
- Do not mention observers' names or identities.
Reply with JSON only: {"text": "..."}`;

const schema = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
  additionalProperties: false,
} as const;

async function askAi(client: Anthropic, sheet: ReturnType<typeof factSheet>): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: `Fact sheet:\n${JSON.stringify(sheet, null, 2)}` }],
  });
  if (res.stop_reason === "refusal") throw new Error("model refused");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("no text block");
  return (JSON.parse(block.text) as { text: string }).text.trim();
}

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
    const facts = computeFacts(site.id, file);
    const sheet = factSheet(site, facts);
    let summary: Summary | null = null;

    for (let attempt = 1; client && attempt <= MAX_ATTEMPTS && !summary; attempt++) {
      try {
        const text = await askAi(client, sheet);
        const problem = checkSummary(text, sheet, allNames);
        if (problem) {
          console.warn(`[${site.id}] attempt ${attempt} rejected: ${problem}`);
        } else {
          summary = { text, source: "ai", model: MODEL, generatedAt: new Date().toISOString(), dataUpTo: facts.dataUpTo };
        }
      } catch (err) {
        console.warn(`[${site.id}] attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    summary ??= {
      text: templateSummary(site, facts),
      source: "template",
      model: null,
      generatedAt: new Date().toISOString(),
      dataUpTo: facts.dataUpTo,
    };
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
