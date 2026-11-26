import type { Group } from "./groups";

export type Sighting = {
  id: number;
  siteId: string;
  url: string;
  observedOn: string; // YYYY-MM-DD
  scientificName: string;
  commonName: string | null;
  iconicTaxon: string | null;
  groups: Group[];
  observer: string;
  license: string | null;
  photo: { url: string; attribution: string; license: string | null } | null;
  qualityGrade: string;
};

export type SightingsFile = {
  source: string;
  fetchedAt: string;
  from: string;
  dataUpTo: string;
  radiusM: number;
  sightings: Sighting[];
};

export function displayName(s: Pick<Sighting, "commonName" | "scientificName">): string {
  return s.commonName ?? s.scientificName;
}
