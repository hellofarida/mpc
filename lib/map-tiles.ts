/**
 * Where the map pictures (tiles) come from, and the guardrails around CARTO's free limit (5 million tile requests a
 * month). Tiles load straight from each visitor's browser, so we can't count or cap them on our side; instead we:
 *   1. keep the key restricted to our website (done in CARTO's dashboard),
 *   2. fall back to OpenStreetMap on their own tiles if CARTO tiles start failing (see components/base-tiles.tsx),
 *   3. ask for fewer tiles (zoom limits, a fence around Melbourne, load only when a move has finished),
 *   4. estimate the month's tiles in the analytics report,
 *   5. keep a one-value switch-off: NEXT_PUBLIC_MAP_PROVIDER=osm (then redeploy).
 * NEXT_PUBLIC_CARTO_KEY is a free key from carto.com/basemaps. It is visible in the page by design: restrict it by domain.
 */
export type Provider = "carto" | "osm";

const KEY = process.env.NEXT_PUBLIC_CARTO_KEY ?? "";
const SWITCH = process.env.NEXT_PUBLIC_MAP_PROVIDER; // "osm" turns CARTO off; "carto" forces it on (testing only)
/** CARTO's free raster styles. Voyager is the default; pick another with NEXT_PUBLIC_CARTO_STYLE (see /dev/map-styles to compare). */
export const CARTO_STYLES: { id: string; name: string }[] = [
  { id: "light_all", name: "Positron" },
  { id: "light_nolabels", name: "Positron, no labels" },
  { id: "voyager", name: "Voyager" },
  { id: "voyager_nolabels", name: "Voyager, no labels" },
  { id: "dark_all", name: "Dark Matter" },
  { id: "dark_nolabels", name: "Dark Matter, no labels" },
];
const STYLE = CARTO_STYLES.some((x) => x.id === process.env.NEXT_PUBLIC_CARTO_STYLE) ? process.env.NEXT_PUBLIC_CARTO_STYLE! : "voyager";
export const cartoTileUrl = (style: string) => `https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png?key=${KEY}`;
const CARTO_BASE = process.env.NEXT_PUBLIC_CARTO_BASE ?? `https://basemaps.cartocdn.com/rastertiles/${STYLE}`;
export const DEFAULT_CARTO_STYLE = STYLE;

export const CARTO_ENABLED = SWITCH !== "osm" && (!!KEY || SWITCH === "carto");

export const TILE_SOURCES: Record<Provider, { url: string; attribution: string }> = {
  carto: {
    url: `${CARTO_BASE}/{z}/{x}/{y}.png?key=${KEY}`,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution/" target="_blank" rel="noopener noreferrer">CARTO</a>',
  },
  osm: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  },
};

/** Guardrail 3: only the corridor and its surroundings, and no zooming out to the world or in to a doorstep. */
export const MAP_LIMITS = {
  minZoom: 11,
  maxZoom: 18,
  maxBounds: [[-37.93, 144.85], [-37.75, 145.08]] as [[number, number], [number, number]],
};

const FELL_BACK = "mpc-tiles-osm";
export function initialProvider(): Provider {
  if (!CARTO_ENABLED) return "osm";
  try {
    return sessionStorage.getItem(FELL_BACK) ? "osm" : "carto";
  } catch {
    return "carto";
  }
}
export function rememberFallback() {
  try {
    sessionStorage.setItem(FELL_BACK, "1");
  } catch {
    /* storage blocked: the next map just tries CARTO again */
  }
}
