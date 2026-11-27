/**
 * Hand-run: npm run site-images. MOCK pictures for the site cards: for each site, a photo of a flowering native plant
 * seen near it (MPC iNaturalist project, CC-licensed, open location). Saves data/site-images.json.
 * Photos are linked from iNaturalist, never downloaded or copied, and each keeps its credit. Replace these with
 * Heartscapes' own photos of the gardens before launch.
 */
import { writeFileSync } from "node:fs";
import { SITES } from "../lib/sites";
import type { SiteImage } from "../lib/site-images";

const UA = "MPC-guide-prototype/0.1 (student project, non-commercial)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LICENSES = "cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa,cc0";

type Obs = { id: number; uri: string; taxon?: { id: number; name: string; preferred_common_name?: string }; photos?: { url: string; attribution: string; license_code: string | null }[] };

async function find(lat: number, lng: number, flowering: boolean, radiusKm: number): Promise<Obs[]> {
  const q = new URLSearchParams({
    project_id: "melbourne-pollinator-corridor", iconic_taxa: "Plantae", native: "true", photos: "true",
    license: LICENSES, geoprivacy: "open", lat: String(lat), lng: String(lng), radius: String(radiusKm),
    per_page: "30", order_by: "votes",
    ...(flowering ? { term_id: "12", term_value_id: "13" } : {}), // Plant Phenology: Flowering
  });
  const res = await fetch(`https://api.inaturalist.org/v1/observations?${q}`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`iNaturalist HTTP ${res.status}`);
  const j = (await res.json()) as { results: Obs[] };
  await sleep(1200);
  return j.results.filter((o) => o.photos?.[0] && o.taxon);
}

async function main() {
  const out: Record<string, SiteImage> = {};
  const usedTaxa = new Set<number>();
  for (const site of SITES) {
    const a = site.addresses[0];
    let pick: Obs | undefined;
    for (const [flowering, r] of [[true, 0.3], [false, 0.3], [true, 2]] as const) {
      const obs = await find(a.lat, a.lng, flowering, r);
      pick = obs.find((o) => !usedTaxa.has(o.taxon!.id)) ?? obs[0];
      if (pick) break;
    }
    if (!pick) { console.warn(`No photo found for ${site.name}`); continue; }
    usedTaxa.add(pick.taxon!.id);
    const ph = pick.photos![0];
    out[site.id] = {
      url: ph.url.replace("/square.", "/small."),
      plant: pick.taxon!.preferred_common_name ?? pick.taxon!.name,
      credit: ph.attribution,
      observationUrl: pick.uri,
    };
    console.log(`${site.name}: ${out[site.id].plant} (${ph.attribution})`);
  }
  writeFileSync(new URL("../data/site-images.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
  console.log("Saved data/site-images.json");
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
