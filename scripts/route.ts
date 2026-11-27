/**
 * Hand-run: npm run route. Draws the corridor route: Westgate Park -> the 8 main sites (west to east) -> Royal Botanic
 * Gardens Melbourne, following real footpaths and bike paths, plus the direct path between every pair of sites (so
 * a walk through just the sites a visitor picked can be drawn). Saves data/route.json (walking and cycling).
 * The app only draws that saved file; visitors' browsers never call a routing service.
 *
 * Routing: the free OpenStreetMap routing service run by FOSSGIS (routing.openstreetmap.de). Light use only: about 60 requests, once, a second or more apart.
 * Route data is OpenStreetMap data (ODbL), credited on the map as "OpenStreetMap contributors".
 * This is an indicative route through our sites, not an official Heartscapes route: ask them to confirm.
 */
import { writeFileSync } from "node:fs";
import { SITES, siteCentre, sortWestToEast } from "../lib/sites";
import type { RouteFile, RouteVariant } from "../lib/route";

const UA = "MPC-guide-prototype/0.1 (student project, non-commercial)";
const START = { name: "Westgate Park", lat: -37.83108, lng: 144.90812 }; // OpenStreetMap (Nominatim), checked 2026-11-27
const END = { name: "Royal Botanic Gardens Melbourne", lat: -37.82946, lng: 144.98132 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ramer–Douglas–Peucker, tolerance in metres (flat-earth approximation is plenty at this scale). */
function simplify(pts: [number, number][], tolM: number): [number, number][] {
  const kx = 111320 * Math.cos((-37.83 * Math.PI) / 180);
  const ky = 110574;
  const dist = (p: [number, number], a: [number, number], b: [number, number]) => {
    const [px, py, ax, ay, bx, by] = [p[1] * kx, p[0] * ky, a[1] * kx, a[0] * ky, b[1] * kx, b[0] * ky];
    const dx = bx - ax, dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    let max = 0, idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = dist(pts[k], pts[i], pts[j]);
      if (d > max) { max = d; idx = k; }
    }
    if (max > tolM && idx > 0) { keep[idx] = true; stack.push([i, idx], [idx, j]); }
  }
  return pts.filter((_, i) => keep[i]);
}

async function route(profile: "foot" | "bike", waypoints: { lat: number; lng: number }[], quiet = false): Promise<RouteVariant> {
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${profile}: HTTP ${res.status}`);
  const data = (await res.json()) as { code: string; routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
  const r = data.routes?.[0];
  if (data.code !== "Ok" || !r) throw new Error(`${profile}: ${data.code}`);
  const latlng = r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  const coordsOut = simplify(latlng, 3).map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5] as [number, number]);
  if (!quiet) console.log(`${profile}: ${Math.round(r.distance)} m, ${Math.round(r.duration / 60)} min, ${latlng.length} -> ${coordsOut.length} points`);
  return { distanceM: Math.round(r.distance), durationS: Math.round(r.duration), coords: coordsOut };
}

async function legsBetween(stops: { id: string; lat: number; lng: number }[]) {
  const legs: RouteFile["legs"] = {};
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const pair = [stops[i], stops[j]];
      const walking = await route("foot", pair, true);
      await sleep(1300);
      const cycling = await route("bike", pair, true);
      await sleep(1300);
      (legs[stops[i].id] ??= {})[stops[j].id] = { walking, cycling };
    }
  }
  return legs;
}

async function main() {
  const ordered = sortWestToEast(SITES);
  const stops = ordered.map((s) => ({ name: s.name, ...siteCentre(s) }));
  const waypoints = [START, ...stops, END];
  const walking = await route("foot", waypoints);
  await sleep(1500);
  const cycling = await route("bike", waypoints);
  console.log("Drawing the path between every pair of sites (about 2 minutes)...");
  const legs = await legsBetween(ordered.map((s) => ({ id: s.id, ...siteCentre(s) })));
  const file: RouteFile = {
    source: "OpenStreetMap contributors, routed by the FOSSGIS routing service",
    generatedAt: new Date().toISOString(),
    waypoints,
    variants: { walking, cycling },
    legs,
  };
  writeFileSync(new URL("../data/route.json", import.meta.url), JSON.stringify(file) + "\n");
  console.log("Saved data/route.json");
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
