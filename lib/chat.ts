import { GROUPS, GROUP_LABELS, type Group } from "./groups";
import { isGenericName } from "./facts";
import { displayName, type SightingsFile } from "./sightings";
import { SITES, type Site } from "./sites";
import { checkText } from "./summary";

/** Per-garden chatbot. Code validates, looks up and checks; the AI only picks a lookup and words the result. */

export const MAX_QUESTION_CHARS = 200;
export const MAX_ANSWER_CHARS = 400;
export const MAX_ATTEMPTS = 2; // per AI call: one try plus one retry
const RECENT_N = 5;
const TOP_N = 5;

// ---------- 1. input validation ----------

export type Validation = { ok: true; question: string } | { ok: false; message: string };

const ABUSE = [
  /ignore (all |any |the )?(previous|above|prior|earlier)/i,
  /\b(system|developer) (prompt|message|instructions?)\b/i,
  /\byou are now\b/i,
  /\b(api[ -]?key|password|secret|token)s?\b/i,
  /\bjailbreak\b/i,
  /<\/?[a-z][^>]*>/i, // anything that looks like markup
];

export function validateQuestion(raw: unknown): Validation {
  if (typeof raw !== "string") return { ok: false, message: "Please type a question." };
  const q = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (q.length === 0) return { ok: false, message: "Please type a question." };
  if (q.length > MAX_QUESTION_CHARS) {
    return { ok: false, message: `Please keep your question under ${MAX_QUESTION_CHARS} characters.` };
  }
  if (!/\p{L}{2,}/u.test(q)) return { ok: false, message: "Please ask your question in words." };
  if (ABUSE.some((re) => re.test(q))) {
    return { ok: false, message: "I can only answer questions about the sightings at this garden." };
  }
  return { ok: true, question: q };
}

// ---------- 2. the 3 read-only lookups ----------

export type LookupName = "counts" | "top_species" | "recent_sightings";
export type Lookup = { name: LookupName; group: Group | null };

export const LOOKUP_NAMES: LookupName[] = ["counts", "top_species", "recent_sightings"];

export type LookupResult = {
  lookup: LookupName;
  site: string;
  group: string | null;
  period: string;
  dataUpTo: string;
  totalSightings: number;
  distinctSpecies: number;
  numberOfObservers?: number;
  sightingsByGroup?: Record<string, number>;
  mostRecordedSpecies?: { name: string; sightings: number }[];
  recentSightings?: { species: string; date: string }[];
};

/** Pure function over the saved file. The garden comes from the page, never from the model. No observer names. */
export function runLookup(siteId: string, lookup: Lookup, file: SightingsFile, sites: Site[] = SITES): LookupResult {
  const site = sites.find((x) => x.id === siteId);
  if (!site) throw new Error(`Unknown site ${siteId}`);
  const inSite = file.sightings.filter((s) => s.siteId === siteId);
  const mine = lookup.group ? inSite.filter((s) => s.groups.includes(lookup.group!)) : inSite;
  const base: LookupResult = {
    lookup: lookup.name,
    site: site.name,
    group: lookup.group ? GROUP_LABELS[lookup.group] : null,
    period: `${file.from} to ${file.dataUpTo}`,
    dataUpTo: file.dataUpTo,
    totalSightings: mine.length,
    distinctSpecies: new Set(mine.map((s) => s.scientificName)).size,
  };

  if (lookup.name === "counts") {
    base.numberOfObservers = new Set(mine.map((s) => s.observer)).size;
    if (!lookup.group) {
      base.sightingsByGroup = Object.fromEntries(
        GROUPS.map((g) => [GROUP_LABELS[g], inSite.filter((s) => s.groups.includes(g)).length]),
      );
    }
  } else if (lookup.name === "top_species") {
    const tally = new Map<string, { name: string; sightings: number }>();
    for (const s of mine) {
      const e = tally.get(s.scientificName);
      if (e) e.sightings += 1;
      else tally.set(s.scientificName, { name: displayName(s), sightings: 1 });
    }
    base.mostRecordedSpecies = [...tally.values()]
      .filter((s) => !isGenericName(s.name))
      .sort((a, b) => b.sightings - a.sightings || a.name.localeCompare(b.name))
      .slice(0, TOP_N);
  } else {
    base.recentSightings = [...mine]
      .sort((a, b) => b.observedOn.localeCompare(a.observedOn) || b.id - a.id)
      .slice(0, RECENT_N)
      .map((s) => ({ species: displayName(s), date: s.observedOn }));
  }
  return base;
}

/** Species names the answer may mention. */
export function listedNames(r: LookupResult): string[] {
  return [...(r.mostRecordedSpecies ?? []).map((s) => s.name), ...(r.recentSightings ?? []).map((s) => s.species)];
}

// ---------- 3. out-of-scope: decided in code or by the AI's "out_of_scope" choice ----------

export const DECLINE_REASONS = ["photo_id", "other_garden", "plant_care", "organisation", "other"] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export type Link = { href: string; label: string; destination: string };

const DECLINES: Record<DeclineReason, { message: string; link?: Link }> = {
  photo_id: {
    message: "I can't identify species from photos. The iNaturalist community can help with that.",
    link: { href: "https://www.inaturalist.org/", label: "Open iNaturalist", destination: "iNaturalist" },
  },
  other_garden: { message: "I can only answer about this garden. Open another garden's page to ask about it." },
  plant_care: {
    message: "I can't give gardening or plant care advice. I can tell you what has been recorded at this garden.",
  },
  organisation: {
    message:
      "I can't answer questions about the organisation or the project. Use the Join and Volunteer buttons below to reach the team.",
  },
  other: {
    message:
      "I can only answer about the sightings saved for this garden: how many, which groups, the most recorded species and the latest sightings.",
  },
};

export function declineFor(reason: DeclineReason) {
  return DECLINES[reason];
}

/** Cheap checks that save an AI call. The AI can still choose out_of_scope for what these miss. */
export function obviousOutOfScope(question: string, siteId: string, sites: Site[] = SITES): DeclineReason | null {
  const q = question.toLowerCase();
  if (/\b(identify|identification|what (species|bug|insect|bee|plant) is (this|that)|id (this|my))\b/.test(q)) return "photo_id";
  if (/\b(water|watering|prune|pruning|fertili[sz]er|soil|compost|weeds?)\b/.test(q) || /how (do|to|can) (i )?(grow|plant)/.test(q)) {
    return "plant_care";
  }
  if (/\bheartscapes\b|who (runs|owns|manages|funds)|\b(volunteer(ing)?|donat\w+)\b/.test(q)) return "organisation";
  for (const s of sites) {
    if (s.id === siteId) continue;
    const short = s.name.toLowerCase();
    if (q.includes(short)) return "other_garden";
  }
  return null;
}

/** Validates the AI's tool choice. Returns null if it isn't one of our lookups. */
export function parseChoice(
  name: unknown,
  input: unknown,
): { lookup: Lookup } | { decline: DeclineReason } | null {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  if (name === "out_of_scope") {
    return (DECLINE_REASONS as readonly string[]).includes(obj.reason as string)
      ? { decline: obj.reason as DeclineReason }
      : { decline: "other" };
  }
  if (typeof name !== "string" || !(LOOKUP_NAMES as string[]).includes(name)) return null;
  const g = obj.group;
  if (g !== undefined && g !== null && !(GROUPS as readonly string[]).includes(g as string)) return null;
  return { lookup: { name: name as LookupName, group: (g as Group | null | undefined) ?? null } };
}

/** The simpler rule used when the AI can't pick: keywords. */
export function keywordLookup(question: string): Lookup {
  const q = question.toLowerCase();
  const group =
    (GROUPS as readonly Group[])
      .slice()
      .sort((a, b) => GROUP_LABELS[b].length - GROUP_LABELS[a].length)
      .find((g) => q.includes(GROUP_LABELS[g]) || (g === "butterflies_moths" && /butterfl|moth/.test(q))) ?? null;
  if (/\b(recent\w*|latest|last|newest|lately|today|this week)\b/.test(q)) return { name: "recent_sightings", group };
  if (/\b(most|common|top|which|what species|what kind)\b/.test(q)) return { name: "top_species", group };
  return { name: "counts", group };
}

// ---------- 4. checks on the AI's words, and the template fallback ----------

export function checkAnswer(text: unknown, result: LookupResult, allSpeciesNames: string[]): string | null {
  return checkText(text, result, listedNames(result), allSpeciesNames, { maxChars: MAX_ANSWER_CHARS, maxSentences: 3 });
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function templateAnswer(r: LookupResult): string {
  const what = r.group ?? "";
  if (r.lookup === "recent_sightings") {
    if (!r.recentSightings?.length) return `No ${what ? what + " " : ""}sightings have been saved for ${r.site} in the last 12 months.`;
    return `Latest ${what ? what + " " : ""}sightings at ${r.site}: ${r.recentSightings.map((s) => `${s.species} (${s.date})`).join(", ")}.`;
  }
  if (r.lookup === "top_species") {
    if (!r.mostRecordedSpecies?.length) {
      return `No ${what ? what + " " : ""}species have been identified at ${r.site} in the saved sightings.`;
    }
    return `Most recorded ${what ? what + " " : "species "}at ${r.site}: ${r.mostRecordedSpecies.map((s) => `${s.name} (${s.sightings})`).join(", ")}.`;
  }
  if (r.totalSightings === 0) return `No ${what ? what + " " : ""}sightings have been saved for ${r.site} in the last 12 months.`;
  const head = `${r.site} has ${r.totalSightings} ${what ? what + " " : ""}${r.totalSightings === 1 ? "sighting" : "sightings"} of ${plural(r.distinctSpecies, "species", "species")} from ${plural(r.numberOfObservers ?? 0, "observer", "observers")} in the last 12 months.`;
  const groups = Object.entries(r.sightingsByGroup ?? {}).filter(([, n]) => n > 0);
  return groups.length ? `${head} By group: ${groups.map(([g, n]) => `${g} ${n}`).join(", ")}.` : head;
}

export const sourceLine = (r: LookupResult) =>
  `From the saved MPC sightings for ${r.site}, ${r.period}. Data up to ${r.dataUpTo}.`;

// ---------- 5. the pipeline ----------

/** The two AI calls, injected so the pipeline can be tested without a key. Each may throw. */
export interface ChatAi {
  /** Call 1: strict tool choice. Returns the tool name and its input. */
  pickLookup(siteName: string, question: string): Promise<{ name: string; input: unknown }>;
  /** Call 2: returns the answer text from the lookup result only. */
  writeAnswer(question: string, result: LookupResult): Promise<string>;
}

export type ChatReply =
  | { kind: "answer"; text: string; source: "ai" | "template"; sourceLine: string; lookup: LookupName }
  | { kind: "declined"; message: string; link?: Link }
  | { kind: "invalid"; message: string };

export async function answerQuestion(
  siteId: string,
  raw: unknown,
  ai: ChatAi | null,
  file: SightingsFile,
  log: (msg: string) => void = () => {},
  sites: Site[] = SITES,
): Promise<ChatReply> {
  const site = sites.find((x) => x.id === siteId);
  if (!site) return { kind: "invalid", message: "Unknown garden." };

  const v = validateQuestion(raw);
  if (!v.ok) return { kind: "invalid", message: v.message };
  const question = v.question;

  const early = obviousOutOfScope(question, siteId, sites);
  if (early) return { kind: "declined", ...declineFor(early) };

  // AI call 1: pick one lookup (max 2 attempts), else the keyword rule
  let lookup: Lookup | null = null;
  for (let attempt = 1; ai && attempt <= MAX_ATTEMPTS && !lookup; attempt++) {
    try {
      const picked = await ai.pickLookup(site.name, question);
      const choice = parseChoice(picked.name, picked.input);
      if (!choice) {
        log(`pick attempt ${attempt} rejected: not one of our lookups`);
      } else if ("decline" in choice) {
        return { kind: "declined", ...declineFor(choice.decline) };
      } else {
        lookup = choice.lookup;
      }
    } catch (err) {
      log(`pick attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  lookup ??= keywordLookup(question);

  // code runs the lookup
  const result = runLookup(siteId, lookup, file, sites);
  const src = sourceLine(result);

  // AI call 2: word the answer; code checks it (max 2 attempts), else the template
  const allNames = [...new Set(file.sightings.flatMap((s) => [s.scientificName, s.commonName ?? ""]))].filter(Boolean);
  for (let attempt = 1; ai && attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = (await ai.writeAnswer(question, result)).trim();
      const problem = checkAnswer(text, result, allNames);
      if (!problem) return { kind: "answer", text, source: "ai", sourceLine: src, lookup: lookup.name };
      log(`answer attempt ${attempt} rejected: ${problem}`);
    } catch (err) {
      log(`answer attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { kind: "answer", text: templateAnswer(result), source: "template", sourceLine: src, lookup: lookup.name };
}
