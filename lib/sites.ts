import sitesData from "@/data/sites.json";

export type Address = { label: string; lat: number; lng: number; approx?: boolean };

export type Site = {
  id: string;
  number: number;
  name: string;
  suburb: string;
  gardens: number;
  gardensNote?: string;
  areaM2: number;
  note?: string;
  addresses: Address[];
};

export const SITES: Site[] = sitesData.sites;

export const SITE_IDS = SITES.map((s) => s.id);

export function getSite(id: string): Site | undefined {
  return SITES.find((s) => s.id === id);
}

export function isSiteId(id: unknown): id is string {
  return typeof id === "string" && SITE_IDS.includes(id);
}

/** One pin per site: the average of its addresses. */
export function siteCentre(site: Site): { lat: number; lng: number } {
  const n = site.addresses.length;
  return {
    lat: site.addresses.reduce((sum, a) => sum + a.lat, 0) / n,
    lng: site.addresses.reduce((sum, a) => sum + a.lng, 0) / n,
  };
}

/** West → east along the corridor (Westgate Park → Royal Botanic Gardens). */
export function sortWestToEast(sites: Site[]): Site[] {
  return [...sites].sort((a, b) => siteCentre(a).lng - siteCentre(b).lng);
}

/** Distance in metres between two points (haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
