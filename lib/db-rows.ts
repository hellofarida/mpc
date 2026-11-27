// Plain conversions between database rows (snake_case) and the app's types (camelCase). No Supabase imports here.
import type { Group } from "./groups";
import type { Sighting, SightingsFile } from "./sightings";
import type { Site } from "./sites";
import type { Summary } from "./summary";

export type SiteRow = {
  id: string; number: number; name: string; suburb: string; gardens: number; gardens_note: string | null;
  area_m2: number; note: string | null; addresses: Site["addresses"]; kind?: string;
};
export type SightingRow = {
  id: number; site_id: string; url: string; observed_on: string; scientific_name: string; common_name: string | null;
  iconic_taxon: string | null; groups: string[]; observer: string; license: string | null; photo_url: string | null;
  photo_attribution: string | null; photo_license: string | null; quality_grade: string;
};
export type SummaryRow = { site_id: string; text: string; source: string; model: string | null; generated_at: string; data_up_to: string };
export type MetaRow = { id: 1; source: string; fetched_at: string; from_date: string; data_up_to: string; radius_m: number };

export const siteFromRow = (r: SiteRow): Site => ({
  id: r.id, number: r.number, name: r.name, suburb: r.suburb, gardens: r.gardens,
  ...(r.gardens_note ? { gardensNote: r.gardens_note } : {}),
  areaM2: r.area_m2,
  ...(r.kind === "scattered" ? { kind: "scattered" as const } : {}),
  ...(r.note ? { note: r.note } : {}),
  addresses: r.addresses,
});
export const siteToRow = (s: Site): SiteRow => ({
  id: s.id, number: s.number, name: s.name, suburb: s.suburb, gardens: s.gardens, gardens_note: s.gardensNote ?? null,
  area_m2: s.areaM2, note: s.note ?? null, addresses: s.addresses,
});

export const sightingFromRow = (r: SightingRow): Sighting => ({
  id: r.id, siteId: r.site_id, url: r.url, observedOn: r.observed_on, scientificName: r.scientific_name,
  commonName: r.common_name, iconicTaxon: r.iconic_taxon, groups: r.groups as Group[], observer: r.observer,
  license: r.license,
  photo: r.photo_url ? { url: r.photo_url, attribution: r.photo_attribution ?? "", license: r.photo_license } : null,
  qualityGrade: r.quality_grade,
});
export const sightingToRow = (s: Sighting): SightingRow => ({
  id: s.id, site_id: s.siteId, url: s.url, observed_on: s.observedOn, scientific_name: s.scientificName,
  common_name: s.commonName, iconic_taxon: s.iconicTaxon, groups: s.groups, observer: s.observer, license: s.license,
  photo_url: s.photo?.url ?? null, photo_attribution: s.photo?.attribution ?? null, photo_license: s.photo?.license ?? null,
  quality_grade: s.qualityGrade ?? "",
});

export const summaryFromRow = (r: SummaryRow): Summary => ({
  text: r.text, source: r.source as Summary["source"], model: r.model, generatedAt: r.generated_at, dataUpTo: r.data_up_to,
});
export const summaryToRow = (siteId: string, s: Summary): SummaryRow => ({
  site_id: siteId, text: s.text, source: s.source, model: s.model, generated_at: s.generatedAt, data_up_to: s.dataUpTo,
});

export const metaFromRow = (r: MetaRow, sightings: Sighting[]): SightingsFile => ({
  source: r.source, fetchedAt: r.fetched_at, from: r.from_date, dataUpTo: r.data_up_to, radiusM: r.radius_m, sightings,
});
export const metaToRow = (f: SightingsFile): MetaRow => ({
  id: 1, source: f.source, fetched_at: f.fetchedAt, from_date: f.from, data_up_to: f.dataUpTo, radius_m: f.radiusM,
});
