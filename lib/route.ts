export type RouteVariant = {
  distanceM: number;
  durationS: number;
  coords: [number, number][]; // [lat, lng]
};

export type RouteFile = {
  source: string;
  generatedAt: string;
  waypoints: { name: string; lat: number; lng: number }[];
  /** The whole corridor: Westgate Park, every main site west to east, Royal Botanic Gardens. */
  variants: { walking: RouteVariant; cycling: RouteVariant };
  /** Direct path between two sites, for every pair in west-to-east order: legs[fromSiteId][toSiteId]. */
  legs: Record<string, Record<string, { walking: RouteVariant; cycling: RouteVariant }>>;
};

export type RouteMode = "off" | "walking" | "cycling";

export const km = (m: number) => `${(m / 1000).toFixed(1)} km`;
export const minutes = (s: number) => {
  const m = Math.round(s / 60);
  return m >= 90 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${m} min`;
};

/**
 * The path for a chosen set of sites, given in west-to-east order: the direct path from each one to the next.
 * Returns null if a leg is missing (for example a site added after the routes were drawn).
 */
export function chosenPath(route: RouteFile, orderedSiteIds: string[], mode: "walking" | "cycling"): RouteVariant | null {
  if (orderedSiteIds.length < 2) return null;
  const out: RouteVariant = { distanceM: 0, durationS: 0, coords: [] };
  for (let i = 0; i < orderedSiteIds.length - 1; i++) {
    const leg = route.legs[orderedSiteIds[i]]?.[orderedSiteIds[i + 1]]?.[mode];
    if (!leg) return null;
    out.distanceM += leg.distanceM;
    out.durationS += leg.durationS;
    out.coords.push(...leg.coords);
  }
  return out;
}
