import { GROUPS, GROUP_LABELS, type Group } from "./groups";
import { displayName, type SightingsFile } from "./sightings";

export type TopSpecies = { name: string; sightings: number };

/** Every number the summaries and the chatbot may quote. Code calculates; the AI only words. */
export type SiteFacts = {
  siteId: string;
  totalSightings: number;
  distinctSpecies: number;
  /** Sightings per group (a sighting can count in more than one group, e.g. bees and native bees). */
  groupCounts: Record<Group, number>;
  latestSighting: string | null; // YYYY-MM-DD
  observers: number;
  topSpecies: TopSpecies[];
  from: string;
  dataUpTo: string;
};

const TOP_N = 3;

const GENERIC = new Set([
  ...Object.values(GROUP_LABELS), "insects", "insect", "plants", "animals", "birds", "fungi", "flies",
  "spiders", "butterflies and moths", "true bugs", "beetles",
]);
/** Broad iNaturalist labels like "Bees" or "Butterflies and Moths" are not species. */
export function isGenericName(name: string): boolean {
  return GENERIC.has(name.trim().toLowerCase());
}

export function computeFacts(siteId: string, file: SightingsFile): SiteFacts {
  const mine = file.sightings.filter((s) => s.siteId === siteId);
  const groupCounts = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<Group, number>;
  const species = new Map<string, TopSpecies>();
  const observers = new Set<string>();
  let latest: string | null = null;

  for (const s of mine) {
    for (const g of s.groups) groupCounts[g] += 1;
    observers.add(s.observer);
    if (latest === null || s.observedOn > latest) latest = s.observedOn;
    const entry = species.get(s.scientificName);
    if (entry) entry.sightings += 1;
    else species.set(s.scientificName, { name: displayName(s), sightings: 1 });
  }

  const topSpecies = [...species.values()]
    .filter((s) => !isGenericName(s.name))
    .sort((a, b) => b.sightings - a.sightings || a.name.localeCompare(b.name))
    .slice(0, TOP_N);

  return {
    siteId,
    totalSightings: mine.length,
    distinctSpecies: species.size,
    groupCounts,
    latestSighting: latest,
    observers: observers.size,
    topSpecies,
    from: file.from,
    dataUpTo: file.dataUpTo,
  };
}
