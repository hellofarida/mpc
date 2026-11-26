import assert from "node:assert/strict";
import { SITES } from "../lib/sites";
import { buildGoogleWalkUrl, buildAppleWalkUrl } from "../lib/walk";

const four = [SITES[6], SITES[0], SITES[4], SITES[2]]; // deliberately unsorted
const url = new URL(buildGoogleWalkUrl(four)!);
assert.equal(url.origin + url.pathname, "https://www.google.com/maps/dir/");
assert.equal(url.searchParams.get("travelmode"), "walking");
assert.equal(url.searchParams.get("origin"), null);
assert.equal(url.searchParams.get("waypoints")!.split("|").length, 3);
assert.ok(/^-?\d+\.\d+,-?\d+\.\d+$/.test(url.searchParams.get("destination")!));
// last stop = easternmost
const lngs = [url.searchParams.get("destination")!, ...url.searchParams.get("waypoints")!.split("|")].map((s) => +s.split(",")[1]);
assert.equal(Math.max(...lngs), lngs[0]);
assert.ok(buildGoogleWalkUrl(four, { lat: -37.8, lng: 144.9 })!.includes("origin=-37.80000%2C144.90000"));
assert.equal(buildGoogleWalkUrl([SITES[0]]), null);
assert.ok(buildGoogleWalkUrl(SITES.slice(0, 5)));
assert.equal(buildGoogleWalkUrl(SITES.slice(0, 6)), null);
assert.ok(buildAppleWalkUrl(four)!.startsWith("https://maps.apple.com/?daddr=-37."));
console.log("walk checks PASS");
console.log(url.toString());
