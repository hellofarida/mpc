import { GROUPS, GROUP_LABELS } from "./groups";
import { isGenericName, type SiteFacts } from "./facts";
import type { Site } from "./sites";
import summariesData from "@/data/summaries.json";

export type Summary = {
  text: string;
  source: "ai" | "template";
  model: string | null;
  generatedAt: string;
  dataUpTo: string;
};

export type SummariesFile = { summaries: Record<string, Summary> };

export const MAX_SUMMARY_CHARS = 320;

/** What the AI sees: names and counts only, never observers. */
export function factSheet(site: Site, f: SiteFacts) {
  return {
    site: site.name,
    suburb: site.suburb,
    period: `${f.from} to ${f.dataUpTo}`,
    periodMonths: 12,
    totalSightings: f.totalSightings,
    distinctSpecies: f.distinctSpecies,
    numberOfObservers: f.observers,
    latestSighting: f.latestSighting,
    sightingsByGroup: Object.fromEntries(GROUPS.map((g) => [GROUP_LABELS[g], f.groupCounts[g]])),
    mostRecordedSpecies: f.topSpecies.map((s) => ({ name: s.name, sightings: s.sightings })),
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Plain sentences filled from the facts. No AI. */
export function templateSummary(site: Site, f: SiteFacts): string {
  if (f.totalSightings === 0) {
    return `No sightings have been saved for ${site.name} in the last 12 months.`;
  }
  const first = `${site.name} has ${plural(f.totalSightings, "sighting", "sightings")} of ${plural(
    f.distinctSpecies,
    "species",
    "species",
  )} from ${plural(f.observers, "observer", "observers")} in the last 12 months, the latest on ${f.latestSighting}.`;
  const parts = (["bees", "butterflies_moths", "hoverflies", "wasps", "beetles"] as const)
    .filter((g) => f.groupCounts[g] > 0)
    .map((g) => `${GROUP_LABELS[g]} ${f.groupCounts[g]}`);
  const second = parts.length > 0 ? ` By group: ${parts.join(", ")}.` : "";
  const top = f.topSpecies[0];
  const third = top ? ` The most recorded is ${top.name} (${top.sightings}).` : "";
  return first + second + third;
}

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20, hundred: 100, dozen: 12,
};

const GENERIC_WORDS = new Set([
  "insects", "insect", "plants", "plant", "animals", "birds", "fungi", "bees", "bee", "wasps", "beetles",
  "butterflies", "moths", "flies", "spiders", "unknown",
]);

export type TextLimits = { maxChars: number; maxSentences: number };

/**
 * Code checks the AI's words. Returns null if fine, or the reason it failed.
 * - every number (digits or words) must appear in `data` (the fact sheet or lookup result)
 * - no species from the dataset that `listed` doesn't name
 * - few sentences, max length, no advice, no claims about Heartscapes, no links
 */
export function checkText(
  text: unknown,
  data: unknown,
  listed: string[],
  allSpeciesNames: string[],
  limits: TextLimits,
): string | null {
  if (typeof text !== "string") return "text is not a string";
  const t = text.trim();
  if (t.length === 0) return "empty";
  if (t.length > limits.maxChars) return `too long (${t.length} chars)`;

  const sentences = t.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
  if (sentences.length > limits.maxSentences) return `more than ${limits.maxSentences} sentences (${sentences.length})`;

  const allowed = new Set((JSON.stringify(data).match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
  for (const m of t.match(/\d+(?:[.,]\d+)*/g) ?? []) {
    if (!allowed.has(Number(m.replace(/,/g, "")))) return `number not in fact sheet: ${m}`;
  }
  for (const w of t.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (w in WORD_NUMBERS && !allowed.has(WORD_NUMBERS[w])) return `number word not in fact sheet: ${w}`;
  }

  if (/heartscapes/i.test(t)) return "mentions Heartscapes";
  if (/https?:|www\./i.test(t)) return "contains a link";
  if (/\b(should|must|recommend\w*|you can|you could|visit|best time)\b/i.test(t)) return "gives advice";

  const lower = t.toLowerCase();
  const listedLower = listed.map((n) => n.toLowerCase());
  for (const name of allSpeciesNames) {
    const n = name.toLowerCase();
    if (n.length < 4 || isGenericName(n) || GENERIC_WORDS.has(n) || listedLower.includes(n)) continue;
    if (new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)) {
      return `species not in fact sheet: ${name}`;
    }
  }
  return null;
}

export function checkSummary(text: unknown, sheet: ReturnType<typeof factSheet>, allSpeciesNames: string[]): string | null {
  return checkText(text, sheet, sheet.mostRecordedSpecies.map((s) => s.name), allSpeciesNames, {
    maxChars: MAX_SUMMARY_CHARS,
    maxSentences: 2,
  });
}

const saved = (summariesData as SummariesFile).summaries;

/** Saved summary, or a template computed at build time so the page never shows "coming soon". */
export function getSummary(site: Site, facts: SiteFacts): Summary {
  return (
    saved[site.id] ?? {
      text: templateSummary(site, facts),
      source: "template",
      model: null,
      generatedAt: new Date(0).toISOString(),
      dataUpTo: facts.dataUpTo,
    }
  );
}
