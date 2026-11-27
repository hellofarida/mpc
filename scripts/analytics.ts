/**
 * Hand-run: npm run analytics [-- --since 2026-12-01] [-- --comments]
 * The pilot numbers from our own anonymous events and check-ins (no cookies, no third-party analytics).
 * Needs SUPABASE_SERVICE_ROLE_KEY (events and check-ins are closed to visitors). Test rows from the test device
 * (npm run test:db) and rows marked is_test are left out. Default window: the last 28 days.
 *
 * A "session" is one visit: the random per-tab session id (older rows without one count as one visit per
 * device per day). Targets are the pilot goals in the PRD. Comments are NEVER printed unless you pass --comments,
 * and then without any device id: they are for the project team only.
 */
import { hasAdminKey, readCheckinsSince, readEventsSince, type EventRow } from "../lib/db-admin";

const TEST_DEVICE = "00000000-0000-4000-8000-000000007e57";
const args = process.argv.slice(2);
const sinceArg = args.includes("--since") ? args[args.indexOf("--since") + 1] : undefined;
const since = sinceArg ? new Date(sinceArg) : new Date(Date.now() - 28 * 86400000);
const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(0)}%`);

async function main() {
  if (!hasAdminKey()) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  if (Number.isNaN(since.getTime())) throw new Error("--since needs a date like 2026-12-01");
  const events = (await readEventsSince(since.toISOString())).filter((e) => e.device_id !== TEST_DEVICE);
  const checkins = (await readCheckinsSince(since.toISOString())).filter((c) => c.device_id !== TEST_DEVICE && !c.is_test);

  const key = (e: EventRow) => e.session_id ?? `${e.device_id}:${e.created_at.slice(0, 10)}`;
  const sessions = new Map<string, Set<string>>();
  for (const e of events) {
    if (!sessions.has(key(e))) sessions.set(key(e), new Set());
    sessions.get(key(e))!.add(e.event);
  }
  const total = sessions.size;
  const withEvent = (name: string) => [...sessions.values()].filter((s) => s.has(name)).length;
  const gardenSessions = withEvent("garden_view");
  const both = (a: string, b: string) => [...sessions.values()].filter((s) => s.has(a) && s.has(b)).length;

  console.log(`From ${since.toISOString().slice(0, 10)} (test device excluded)\n`);
  console.log(`Visits (sessions): ${total}`);
  console.log(`  opened a garden page:       ${gardenSessions} (${pct(gardenSessions, total)}; target 60%)`);
  console.log(`  of those, tapped Log sighting: ${both("garden_view", "log_tap")} (${pct(both("garden_view", "log_tap"), gardenSessions)}; target 15%)`);
  console.log(`  of those, tapped Join/Volunteer: ${both("garden_view", "join_tap")} (${pct(both("garden_view", "join_tap"), gardenSessions)}; target 3%)`);
  console.log(`  tapped Directions: ${withEvent("directions_tap")}, opened a walk: ${withEvent("walk_open")}, asked a question: ${withEvent("question")}`);

  const place = new Map<string, number>();
  for (const e of events.filter((x) => x.event === "join_tap")) place.set(e.placement ?? "(none)", (place.get(e.placement ?? "(none)") ?? 0) + 1);
  console.log(`\nJoin / Volunteer taps by button: ${[...place].map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
  console.log("New members attributed: ask Heartscapes to count visits tagged utm_source=mpc-guide (target 5).");

  const byMode = new Map<string, number>();
  for (const c of checkins) byMode.set(c.mode, (byMode.get(c.mode) ?? 0) + 1);
  console.log(`\nCheck-ins: ${checkins.length} (${[...byMode].map(([k, v]) => `${k} ${v}`).join(", ") || "none"})`);
  // Arrival estimate: a Directions tap followed by a check-in at the same garden from the same device within 6 hours.
  let arrivals = 0;
  const taps = events.filter((e) => e.event === "directions_tap" && e.site_id);
  for (const c of checkins) {
    const t = Date.parse(c.created_at);
    if (taps.some((e) => e.device_id === c.device_id && e.site_id === c.site_id && Date.parse(e.created_at) <= t && t - Date.parse(e.created_at) <= 6 * 3600000)) arrivals++;
  }
  console.log(`Estimated arrivals (Directions tap, then check-in within 6 h): ${arrivals} of ${taps.length} Directions taps`);

  const favs = new Map<string, number>();
  for (const c of checkins.filter((x) => x.favourite_site_id)) favs.set(c.favourite_site_id!, (favs.get(c.favourite_site_id!) ?? 0) + 1);
  const comments = checkins.filter((c) => c.comment);
  console.log(`\nFavourite garden picked: ${[...favs].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
  console.log(`Check-ins with a comment: ${comments.length}${args.includes("--comments") ? "" : " (run with --comments to read them; team only)"}`);
  if (args.includes("--comments")) for (const c of comments) console.log(`  ${c.created_at.slice(0, 10)} ${c.site_id}: ${c.comment}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
