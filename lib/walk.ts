import { siteCentre, sortWestToEast, type Site } from "@/lib/sites";

export const MIN_STOPS = 2;
export const MAX_STOPS = 4;

type Point = { lat: number; lng: number };

const fmt = (p: Point) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

/**
 * One Google Maps walking URL. Stops are sorted west → east; the last is the destination,
 * the others are waypoints. `origin` is added only when the visitor already shared their location.
 * Coordinates only: no names or addresses.
 */
export function buildGoogleWalkUrl(stops: Site[], origin?: Point | null): string | null {
  if (stops.length < MIN_STOPS || stops.length > MAX_STOPS) return null;
  const ordered = sortWestToEast(stops).map(siteCentre);
  const destination = ordered[ordered.length - 1];
  const waypoints = ordered.slice(0, -1);
  const params = new URLSearchParams({ api: "1", travelmode: "walking" });
  if (origin) params.set("origin", fmt(origin));
  params.set("destination", fmt(destination));
  params.set("waypoints", waypoints.map(fmt).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Apple Maps only officially supports two points, so: directions to the first (westmost) stop. */
export function buildAppleWalkUrl(stops: Site[]): string | null {
  if (stops.length < MIN_STOPS || stops.length > MAX_STOPS) return null;
  const first = siteCentre(sortWestToEast(stops)[0]);
  return `https://maps.apple.com/?daddr=${fmt(first)}&dirflg=w`;
}

export function googleDirectionsUrl(p: Point): string {
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${fmt(p)}`;
}

export function appleDirectionsUrl(p: Point): string {
  return `https://maps.apple.com/?daddr=${fmt(p)}&dirflg=w`;
}
