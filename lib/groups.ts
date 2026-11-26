// Insect groups the app counts. iNaturalist taxon IDs, checked 26 Nov 2026.
export const TAXA = {
  bees: 630955, // Anthophila
  honeyBee: 47219, // Apis mellifera (introduced, so not a native bee)
  lepidoptera: 47157, // butterflies and moths
  hoverflies: 49995, // Syrphidae
  hymenoptera: 47201,
  ants: 47336, // Formicidae
  beetles: 47208, // Coleoptera
} as const;

export const GROUPS = ["bees", "native_bees", "butterflies_moths", "hoverflies", "wasps", "beetles"] as const;
export type Group = (typeof GROUPS)[number];

export const GROUP_LABELS: Record<Group, string> = {
  bees: "bees",
  native_bees: "native bees",
  butterflies_moths: "butterflies and moths",
  hoverflies: "hoverflies",
  wasps: "wasps",
  beetles: "beetles",
};

/** Which groups a taxon belongs to, from its ancestor IDs (including itself). */
export function groupsFor(taxonIds: number[]): Group[] {
  const has = (id: number) => taxonIds.includes(id);
  const groups: Group[] = [];
  if (has(TAXA.bees)) {
    groups.push("bees");
    if (!has(TAXA.honeyBee)) groups.push("native_bees");
  }
  if (has(TAXA.lepidoptera)) groups.push("butterflies_moths");
  if (has(TAXA.hoverflies)) groups.push("hoverflies");
  // "Wasps": Hymenoptera that aren't bees or ants (includes sawflies, which is close enough for visitors).
  if (has(TAXA.hymenoptera) && !has(TAXA.bees) && !has(TAXA.ants)) groups.push("wasps");
  if (has(TAXA.beetles)) groups.push("beetles");
  return groups;
}
