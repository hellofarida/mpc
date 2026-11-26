/**
 * npm run sightings
 * Saves the last 12 months of MPC iNaturalist observations within ~100 m of each site's addresses
 * to data/sightings.json. Pages and the chatbot only ever read that file.
 *
 * Rules: ~1 request a second (iNaturalist allows ~60/min), a descriptive User-Agent,
 * open locations only (obscured ones can't be matched to a garden), observer credit kept.
 * Photos are linked from iNaturalist, never downloaded. CC BY-NC: non-commercial use only.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { SITES, distanceM } from "../lib/sites";
import { groupsFor } from "../lib/groups";
import type { Sighting, SightingsFile } from "../lib/sightings";

const API = "https://api.inaturalist.org/v1/observations";
const USER_AGENT = "MPC-guide-prototype/0.1 (student project, non-commercial)";
const PROJECT = "melbourne-pollinator-corridor";
const RADIUS_KM = 0.1;
const PER_PAGE = 200;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// iNaturalist returns some names HTML-escaped (e.g. "&lt;3"). Store plain text; React escapes on render.
function decode(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPage(params: Record<string, string>): Promise<any> {
  const url = `${API}?${new URLSearchParams(params)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    if (res.ok) return res.json();
    console.warn(`  HTTP ${res.status}, retrying in ${attempt * 5}s`);
    await sleep(attempt * 5000);
  }
  throw new Error(`Failed after 3 attempts: ${url}`);
}

async function main() {
  const today = new Date();
  const from = new Date(today);
  from.setFullYear(from.getFullYear() - 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = new Map<number, any>();

  for (const site of SITES) {
    for (const addr of site.addresses) {
      let page = 1;
      while (true) {
        const data = await fetchPage({
          project_id: PROJECT,
          lat: String(addr.lat),
          lng: String(addr.lng),
          radius: String(RADIUS_KM),
          d1: isoDate(from),
          geoprivacy: "open",
          taxon_geoprivacy: "open",
          per_page: String(PER_PAGE),
          page: String(page),
          order_by: "observed_on",
          order: "desc",
        });
        for (const o of data.results) raw.set(o.id, o);
        console.log(`${site.name} · ${addr.label}: page ${page}, ${data.results.length} results (total ${data.total_results})`);
        await sleep(1100);
        if (data.results.length < PER_PAGE) break;
        page++;
      }
    }
  }

  const sightings: Sighting[] = [];
  for (const o of raw.values()) {
    if (!o.location || !o.taxon || !o.observed_on) continue;
    const [lat, lng] = o.location.split(",").map(Number);

    // Match to the nearest site (by its nearest address) within 100 m.
    let best: { siteId: string; d: number } | null = null;
    for (const site of SITES) {
      for (const addr of site.addresses) {
        const d = distanceM({ lat, lng }, addr);
        if (d <= RADIUS_KM * 1000 && (!best || d < best.d)) best = { siteId: site.id, d };
      }
    }
    if (!best) continue;

    const photo = o.photos?.[0];
    sightings.push({
      id: o.id,
      siteId: best.siteId,
      url: o.uri,
      observedOn: o.observed_on,
      scientificName: o.taxon.name,
      commonName: decode(o.taxon.preferred_common_name) || null,
      iconicTaxon: o.taxon.iconic_taxon_name ?? null,
      groups: groupsFor([...(o.taxon.ancestor_ids ?? []), o.taxon.id]),
      observer: decode(o.user?.name) || o.user?.login || "an iNaturalist observer",
      license: o.license_code ?? null,
      photo: photo
        ? {
            url: String(photo.url).replace("/square.", "/medium."),
            attribution: decode(photo.attribution),
            license: photo.license_code ?? null,
          }
        : null,
      qualityGrade: o.quality_grade,
    });
  }

  sightings.sort((a, b) => b.observedOn.localeCompare(a.observedOn) || b.id - a.id);

  const file: SightingsFile = {
    source: "MPC iNaturalist project (https://www.inaturalist.org/projects/melbourne-pollinator-corridor)",
    fetchedAt: today.toISOString(),
    from: isoDate(from),
    dataUpTo: sightings[0]?.observedOn ?? isoDate(today),
    radiusM: RADIUS_KM * 1000,
    sightings,
  };

  const out = join(process.cwd(), "data", "sightings.json");
  writeFileSync(out, JSON.stringify(file, null, 1) + "\n");
  const perSite = SITES.map((s) => `${s.name}: ${sightings.filter((x) => x.siteId === s.id).length}`);
  console.log(`\nSaved ${sightings.length} sightings to data/sightings.json\n${perSite.join("\n")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
