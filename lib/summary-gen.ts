/**
 * Writes one garden summary: the AI words it, code checks it, and if the checks fail twice (or there is no
 * AI) a template is used instead. For scripts and the weekly refresh only (never imported by the app).
 */
import Anthropic from "@anthropic-ai/sdk";
import type { SiteFacts } from "./facts";
import type { Site } from "./sites";
import { checkSummary, factSheet, templateSummary, type Summary } from "./summary";

export const SUMMARY_MODEL = "claude-opus-5-5";
const MAX_ATTEMPTS = 2; // hard cap per site: one try plus one retry

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
    model: SUMMARY_MODEL,
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

export async function generateSummary(
  client: Anthropic | null,
  site: Site,
  facts: SiteFacts,
  allNames: string[],
  log: (m: string) => void = console.warn,
): Promise<Summary> {
  const sheet = factSheet(site, facts);
  for (let attempt = 1; client && attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await askAi(client, sheet);
      const problem = checkSummary(text, sheet, allNames);
      if (!problem) {
        return { text, source: "ai", model: SUMMARY_MODEL, generatedAt: new Date().toISOString(), dataUpTo: facts.dataUpTo };
      }
      log(`[${site.id}] attempt ${attempt} rejected: ${problem}`);
    } catch (err) {
      log(`[${site.id}] attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return {
    text: templateSummary(site, facts),
    source: "template",
    model: null,
    generatedAt: new Date().toISOString(),
    dataUpTo: facts.dataUpTo,
  };
}
