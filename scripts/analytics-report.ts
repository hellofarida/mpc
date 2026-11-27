/**
 * Hand-run: npm run analytics:report [-- --since 2026-12-01] [-- --out reports/analytics.html] [-- --open] [-- --watch] [-- --serve [port]] [-- --dev]
 * With --serve it runs a local page (http://localhost:4321, this computer only) that is rebuilt on every reload and shows a
 * LIVE "online now" number over a WebSocket (Supabase Realtime Presence). --dev watches the development channel.
 * With --watch it rewrites the file every 30 seconds and the page reloads itself (Ctrl-C to stop).
 * Writes ONE HTML file (only the live counter uses a script and the network) with the pilot numbers, funnel, drop-off points, paths,
 * per-garden figures and timing, from our own anonymous events and check-ins. It stays on this computer:
 * reports/ is gitignored. Needs SUPABASE_SERVICE_ROLE_KEY. No device ids and no comment text are ever written.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { hasAdminKey, readCheckinsSince, readEventsSince, readSites } from "../lib/db-admin";
import { computeAnalytics, type Analytics } from "../lib/analytics";

const args = process.argv.slice(2);
const arg = (f: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const since = arg("--since") ? new Date(arg("--since")!) : new Date(Date.now() - 28 * 86400000);
const out = resolve(arg("--out") ?? "reports/analytics.html");

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${Math.round((100 * n) / d)}%`);
const dur = (s: number | null) => (s === null ? "n/a" : s < 90 ? `${s}s` : `${Math.round(s / 60)} min`);

/** A horizontal bar list: label, bar, value. `of` is the 100% mark (defaults to the biggest value). */
function bars(rows: { label: string; value: number; note?: string }[], of?: number, unit = "") {
  const max = of ?? Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.value === 0)) return `<p class="muted">Nothing yet.</p>`;
  return `<div class="bars">${rows.map((r) => `<div class="row"><span class="lbl">${esc(r.label)}</span><span class="track"><i style="width:${Math.min(100, (100 * r.value) / max)}%"></i></span><span class="val">${r.value}${unit}${of ? ` <small>${pct(r.value, of)}</small>` : ""}</span></div>${r.note ? `<p class="note">${esc(r.note)}</p>` : ""}`).join("")}</div>`;
}

function column(items: { label: string; value: number }[]) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.every((i) => i.value === 0)) return `<p class="muted">Nothing yet.</p>`;
  return `<div class="cols">${items.map((i) => `<div title="${esc(i.label)}: ${i.value}"><i style="height:${(100 * i.value) / max}%"></i><span>${esc(i.label)}</span></div>`).join("")}</div>`;
}

function kpi(title: string, n: number, d: number, target: number, sub: string) {
  const p = d === 0 ? 0 : (100 * n) / d;
  return `<div class="card kpi"><p class="muted">${esc(title)}</p><p class="big">${pct(n, d)}</p><p class="muted">${n} of ${d} ${esc(sub)} · target ${target}%</p><p class="${d === 0 ? "muted" : p >= target ? "good" : "low"}">${d === 0 ? "no data yet" : p >= target ? "on target" : "below target"}</p></div>`;
}

type Live = { url: string; key: string; channel: string; version: string };

function liveCard(live: Live | null) {
  if (!live) return "";
  const js = (v: string) => JSON.stringify(v).replace(/</g, "\\u003c");
  return `<div class="card kpi"><p class="muted">People online right now</p><p class="big"><span id="live-dot" style="color:var(--good)">●</span> <span id="live-count">…</span></p><p class="muted" id="live-status">Connecting…</p><p class="muted">Visitors with the guide open and visible. A live connection, not a count from the last few minutes.</p></div><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${live.version}/dist/umd/supabase.js"></script><script>(function(){var c=document.getElementById("live-count"),s=document.getElementById("live-status");if(!window.supabase){c.textContent="n/a";s.textContent="Live count unavailable: could not load the live library (offline?).";return}var sb=window.supabase.createClient(${js(live.url)},${js(live.key)},{auth:{persistSession:false}});var ch=sb.channel(${js(live.channel)},{config:{presence:{key:"observer-"+Math.random().toString(36).slice(2)}}});function show(){c.textContent=Object.keys(ch.presenceState()).length;s.textContent="Live, updated "+new Date().toLocaleTimeString("en-AU",{timeZone:"Australia/Melbourne"})}ch.on("presence",{event:"sync"},show).subscribe(function(st){if(st==="SUBSCRIBED"){s.textContent="Connected";show()}else if(st==="CHANNEL_ERROR"||st==="TIMED_OUT"||st==="CLOSED"){c.textContent="n/a";s.textContent="Live count unavailable ("+st+")"}})})();</script>`;
}

function render(a: Analytics, watching: boolean, live: Live | null) {
  const f = a.funnel;
  const section = (h: string, body: string, hint = "") => `<section><h2>${esc(h)}</h2>${hint ? `<p class="muted">${hint}</p>` : ""}${body}</section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MPC analytics</title>${watching ? '<meta http-equiv="refresh" content="30">' : ""}<style>
:root{--bg:#faf9f6;--card:#fff;--ink:#1f2a1f;--mute:#667066;--line:#e3e1da;--bar:#3b6d11;--bar2:#b45309;--good:#3b6d11;--low:#b45309}
@media (prefers-color-scheme:dark){:root{--bg:#141714;--card:#1d211d;--ink:#eef0ea;--mute:#9aa49a;--line:#2e342e;--bar:#7fb23f;--bar2:#e0953b;--good:#7fb23f;--low:#e0953b}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}main{max-width:960px;margin:0 auto;padding:20px 16px 60px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 6px}.muted,.note{color:var(--mute);font-size:13px;margin:2px 0}.note{margin:-2px 0 8px 0}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.big{font-size:30px;font-weight:600;margin:2px 0}.good{color:var(--good);font-weight:600;margin:0}.low{color:var(--low);font-weight:600;margin:0}
.bars .row{display:grid;grid-template-columns:minmax(120px,38%) 1fr auto;gap:10px;align-items:center;margin:6px 0}.lbl{font-size:14px}.track{background:var(--line);border-radius:6px;height:12px;overflow:hidden}.track i{display:block;height:100%;background:var(--bar)}.val{font-variant-numeric:tabular-nums;font-size:14px}.val small{color:var(--mute)}
.cols{display:flex;align-items:flex-end;gap:3px;height:120px;margin-top:8px}.cols div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;min-width:0}.cols i{display:block;width:100%;background:var(--bar2);border-radius:3px 3px 0 0;min-height:1px}.cols span{font-size:10px;color:var(--mute);margin-top:4px;white-space:nowrap}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right}th:first-child,td:first-child{text-align:left}th{color:var(--mute);font-weight:500}
</style></head><body><main>
<h1>MPC guide analytics</h1>
<p class="muted">${esc(a.since.slice(0, 10))} to ${esc(a.until.slice(0, 10))} · ${a.visits} visits · ${a.events} steps · ${a.checkins} check-ins · anonymous, test device left out · generated ${esc(new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" }))} (Melbourne time)</p>

${section("Right now", `<div class="grid">${liveCard(live)}<div class="card kpi"><p class="muted">Visitors who tapped in the last 5 minutes</p><p class="big">${a.activeNow.last5}</p><p class="muted">${a.activeNow.last30} in the last 30 minutes</p></div></div>`, `Counted from taps and page opens only, so someone reading quietly drops out after a few minutes. As of ${esc(new Date(a.until).toLocaleTimeString("en-AU", { timeZone: "Australia/Melbourne" }))} Melbourne time${watching ? " · refreshes every 30 s while the report command is running" : " · run with --watch to keep it live"}.`)}

${section("Unique pageviews", `<div class="grid"><div class="card kpi"><p class="muted">Unique pageviews</p><p class="big">${a.pageviews.uniqueTotal}</p><p class="muted">${a.pageviews.viewsTotal} views in all</p></div></div>${a.pageviews.pages.length ? `<table><tr><th>Page</th><th>Unique pageviews</th><th>Views</th></tr>${a.pageviews.pages.map((p) => `<tr><td>${esc(p.label)}</td><td>${p.unique}</td><td>${p.views}</td></tr>`).join("")}</table>` : ""}`, "Each page counted once per visit. A garden's panel counts as that garden's page. Pages seen before this was tracked are missing.")}

${section("Where visitors are", `<div class="grid"><div class="card"><p class="muted">Australia</p><p class="big">${a.location.australia}</p><p class="muted">of ${a.visits} visits (${pct(a.location.australia, a.visits)})</p></div><div class="card"><p class="muted">By state</p>${bars(a.location.states.map((x) => ({ label: x.label, value: x.visits })), a.location.australia || undefined)}</div><div class="card"><p class="muted">By city (top 10)</p>${bars(a.location.cities.map((x) => ({ label: x.label, value: x.visits })), a.location.australia || undefined)}</div>${a.location.otherCountries.length ? `<div class="card"><p class="muted">Other countries</p>${bars(a.location.otherCountries.map((x) => ({ label: x.label, value: x.visits })))}</div>` : ""}</div><p class="muted">${a.location.unknown} visit${a.location.unknown === 1 ? "" : "s"} with no location (older visits, or a connection the hosting provider couldn't place). Approximate and based on the connection, not the device; on a phone's mobile data it can be the carrier's base city.</p>`)}

${section("Pilot targets", `<div class="grid">${kpi("Visits that opened a garden", a.kpi.gardenOpen, a.visits, 60, "visits")}${kpi("Garden visits that tapped Log a sighting", a.kpi.logTap, a.kpi.gardenVisits, 15, "garden visits")}${kpi("Garden visits that tapped Join or Volunteer", a.kpi.joinTap, a.kpi.gardenVisits, 3, "garden visits")}<div class="card kpi"><p class="muted">Estimated arrivals</p><p class="big">${a.arrivals.arrivals}</p><p class="muted">of ${a.arrivals.directionsTaps} Directions taps were followed by a check-in within 6 h</p></div></div>`, "From the PRD. New members need Heartscapes to count visits tagged <code>utm_source=mpc-guide</code> (target 5).")}

${section("Journey funnel", bars(f.map((s) => ({ label: s.label, value: s.visits })), f[0].visits), "Each step needs the one before it. The drop between bars is where visits were lost.")}

${section("Where visits ended", bars(a.exits.map((e) => ({ label: e.label, value: e.visits })), a.visits), "The last thing a visit did. “Map” means they never opened a garden.")}

${section("Frustration signals", `<table><tr><th>Signal</th><th>Times</th><th>Visits</th><th>% of visits</th></tr>${a.frustration.signals.map((x) => `<tr title="${esc(x.hint)}"><td>${esc(x.label)}<br><small class="muted">${esc(x.hint)}</small></td><td>${x.times}</td><td>${x.visits}</td><td>${pct(x.visits, a.visits)}</td></tr>`).join("")}</table>`, "Logged only when they happen. A few are normal; look for the ones that keep coming back.")}

${a.frustration.byDetail.length ? section("What was behind them", `<table><tr><th>Signal</th><th>Where / what</th><th>Times</th></tr>${a.frustration.byDetail.slice(0, 15).map((x) => `<tr><td>${esc(x.signal)}</td><td>${esc(x.detail)}</td><td>${x.times}</td></tr>`).join("")}</table>`, "“site-card” and “map-pin” are what was tapped. Error codes: chat-template = the chatbot fell back to a plain answer, chat-fail / chat-http = the question didn't go through, checkin-failed, geo-denied / geo-timeout = location, tiles-failed = map tiles, js-error = an app error.") : ""}

${section("Leaving the guide and planning", `<div class="grid"><div class="card"><p class="muted">Cancelled the “You're leaving” box</p><p class="big">${a.frustration.leaveCancel}</p><p class="muted">vs ${a.frustration.leaveContinued} who continued to Join, Volunteer or Log</p></div><div class="card"><p class="muted">Planned stops but never opened the walk</p><p class="big">${a.frustration.planAbandon.reduce((n, p) => n + p.times, 0)}</p><p class="muted">${a.frustration.planAbandon.map((p) => `${p.times} with ${p.stops} stops`).join(", ") || "none yet"}</p></div></div>`)}

${section("Problems by garden", `<table><tr><th>Site</th><th>Opened then closed fast</th><th>Taps and failures</th></tr>${a.frustration.perSite.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.bounces}</td><td>${s.problems}</td></tr>`).join("")}</table>`, "Counts events that happened on that garden's page.")}

${section("Possible friction", bars(a.friction.map((x) => ({ label: x.label, value: x.visits, note: x.note })), a.visits), "Worked out from the steps people took.")}

${section("Devices and speed", `<div class="grid"><div class="card"><p class="muted">Visits by device</p>${bars(a.devices.map((d) => ({ label: d.label, value: d.visits })))}</div><div class="card"><p class="muted">Median page load (about 1 visit in 10 is measured)</p><p class="big">${a.medianLoadMs === null ? "n/a" : `${(a.medianLoadMs / 1000).toFixed(1)}s`}</p></div></div>`)}

${section("What visits did", bars(a.reach.map((r) => ({ label: r.label, value: r.visits })), a.visits), "Share of all visits that did each thing at least once, in any order.")}

${section("Most common paths", bars(a.paths.map((p) => ({ label: p.path, value: p.visits })), a.visits), "The order of steps in a visit, repeats collapsed.")}

${section("Timing", `<div class="grid"><div class="card"><p class="muted">Median visit length</p><p class="big">${dur(a.medianVisitSeconds)}</p></div><div class="card"><p class="muted">Median time from opening the map to opening a garden</p><p class="big">${dur(a.medianSecondsToFirstGarden)}</p><p class="muted">KPI 1 target: under 30 s (measured properly in the user test)</p></div></div>`)}

${section("Gardens", `<table><tr><th>Site</th><th>Opened</th><th>Directions</th><th>Questions</th><th>Join taps</th><th>Check-ins</th></tr>${a.perSite.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.opened}</td><td>${s.directions}</td><td>${s.questions}</td><td>${s.joins}</td><td>${s.checkins}</td></tr>`).join("")}</table>`)}

${section("Visits per day", column(a.perDay.map((d) => ({ label: d.day.slice(5), value: d.visits }))))}
${section("Visits by hour of day (Melbourne)", column(a.perHour.map((h) => ({ label: String(h.hour), value: h.visits }))))}

${section("Check-ins", `<div class="grid"><div class="card"><p class="muted">How they got there</p>${bars(a.checkinsByMode.map((m) => ({ label: m.label, value: m.count })))}</div><div class="card"><p class="muted">Favourite garden (optional)</p>${bars(a.favourites.map((m) => ({ label: m.name, value: m.count })))}<p class="muted">${a.commentCount} check-in${a.commentCount === 1 ? "" : "s"} with a comment (not shown here)</p></div><div class="card"><p class="muted">Join / Volunteer taps by button</p>${bars(a.joinByPlacement.map((m) => ({ label: m.label, value: m.taps })))}</div></div>`)}
</main></body></html>`;
}

async function build(watching: boolean, live: Live | null): Promise<string> {
  const [events, checkins, sites] = await Promise.all([readEventsSince(since.toISOString()), readCheckinsSince(since.toISOString()), readSites()]);
  const a = computeAnalytics(events, checkins, sites.map((s) => ({ id: s.id, name: s.name })), since);
  const html = render(a, watching, live);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`${new Date().toLocaleTimeString()} wrote ${out}: ${a.activeNow.last5} tapped in the last 5 min, ${a.visits} visits, ${a.events} steps, ${a.checkins} check-ins since ${since.toISOString().slice(0, 10)}.`);
  return html;
}

async function main() {
  if (!hasAdminKey()) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  if (Number.isNaN(since.getTime())) throw new Error("--since needs a date like 2026-12-01");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const version = (JSON.parse(readFileSync(new URL("../node_modules/@supabase/supabase-js/package.json", import.meta.url), "utf8")) as { version: string }).version;
  const live: Live | null = key ? { url, key, channel: args.includes("--dev") ? "presence-dev" : "presence-live", version } : null;

  if (args.includes("--serve")) {
    const port = Number(arg("--serve")) || 4321;
    createServer((_req, res) => {
      build(false, live).then(
        (html) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(html); },
        (e) => { res.writeHead(500, { "content-type": "text/plain" }); res.end(String(e)); },
      );
    }).listen(port, "127.0.0.1", () => {
      const where = `http://localhost:${port}`;
      console.log(`Analytics at ${where} (this computer only). Reload the page for fresh numbers; the live count updates by itself. Ctrl-C to stop.`);
      if (args.includes("--open")) execFileSync("open", [where]);
    });
    return;
  }

  const watching = args.includes("--watch");
  await build(watching, live);
  if (args.includes("--open")) execFileSync("open", [out]);
  while (watching) {
    await new Promise((r) => setTimeout(r, 30000));
    try { await build(true, live); } catch (e) { console.warn("refresh failed, will retry:", e instanceof Error ? e.message : e); }
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
