/** A MOCK picture for a site card: a flowering native plant seen nearby (see scripts/site-images.ts). */
export type SiteImage = {
  url: string; // linked from iNaturalist, never copied
  plant: string;
  credit: string; // "(c) Name, some rights reserved (CC BY-NC)"
  observationUrl: string;
};
