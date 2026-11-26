import assert from "node:assert/strict";
import { SITES } from "../lib/sites";
import { GROUPS } from "../lib/groups";
import { computeFacts } from "../lib/facts";
import { checkSummary, factSheet, templateSummary } from "../lib/summary";
import type { SightingsFile } from "../lib/sightings";
import data from "../data/sightings.json";

const file = data as SightingsFile;
const all = SITES.map((s) => computeFacts(s.id, file));

// every sighting counted exactly once across the 8 sites
assert.equal(all.reduce((n, f) => n + f.totalSightings, 0), file.sightings.length);

for (const f of all) {
  const mine = file.sightings.filter((s) => s.siteId === f.siteId);
  assert.ok(f.distinctSpecies <= f.totalSightings);
  assert.ok(f.observers <= f.totalSightings);
  assert.ok(f.groupCounts.native_bees <= f.groupCounts.bees, `${f.siteId}: native bees > bees`);
  for (const g of GROUPS) assert.equal(f.groupCounts[g], mine.filter((s) => s.groups.includes(g)).length);
  assert.equal(f.latestSighting, mine.map((s) => s.observedOn).sort().at(-1) ?? null);
  assert.equal(f.dataUpTo, file.dataUpTo);
  const sheet = factSheet(SITES.find((s) => s.id === f.siteId)!, f);
  // observer names must never reach the AI
  const json = JSON.stringify(sheet);
  for (const s of mine) assert.ok(!json.includes(`"${s.observer}"`), "observer leaked into fact sheet");
}

// number / species / advice checks
const site = SITES[0];
const f = computeFacts(site.id, file);
const sheet = factSheet(site, f);
assert.equal(checkSummary(templateSummary(site, f).split(". ")[0] + ".", sheet, []), null);
assert.match(checkSummary(`There were ${f.totalSightings + 7} sightings.`, sheet, []) ?? "", /number not in fact sheet/);
assert.match(checkSummary("There were nine sightings here.", sheet, []) ?? "", /number/);
assert.match(checkSummary("You should visit in spring.", sheet, []) ?? "", /advice/);
assert.match(checkSummary("Run by Heartscapes.", sheet, []) ?? "", /Heartscapes/);
assert.match(checkSummary("One. Two. Three.", sheet, []) ?? "", /sentences/);
assert.match(checkSummary("Seen: Zzyzx Superbus.", sheet, ["Zzyzx superbus"]) ?? "", /species not in fact sheet/);

console.log("facts checks PASS");
for (const x of all) console.log(x.siteId.padEnd(32), x.totalSightings, "sightings,", x.distinctSpecies, "species,", x.observers, "observers");
