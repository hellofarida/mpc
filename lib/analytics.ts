/**
 * Turns raw anonymous events and check-ins into the numbers the analytics report shows. Pure functions, no database
 * or browser access: scripts fetch the rows (lib/db-admin.ts) and pass them in. Device ids and comments are used only
 * to match things up and are never part of the output.
 */
import type { CheckinRow, EventRow } from "./db-admin";

export const TEST_DEVICE = "00000000-0000-4000-8000-000000007e57";
export const STEP_LABELS: Record<string, string> = {
  page_open: "Map",
  garden_view: "Garden",
  question: "Ask",
  directions_tap: "Directions",
  walk_open: "Walk",
  log_tap: "Log sighting",
  join_tap: "Join / Volunteer",
};
const PAGE_LABELS: Record<string, string> = { home: "Map (home)", about: "About", "get-involved": "Get involved", privacy: "Privacy", other: "Other page" };
const STATES: Record<string, string> = { VIC: "Victoria", NSW: "New South Wales", QLD: "Queensland", SA: "South Australia", WA: "Western Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory" };
const isHome = (e: EventRow) => e.event === "page_open" && (!e.detail || e.detail === "home");
const TZ = "Australia/Melbourne";

export type SiteRef = { id: string; name: string };
export type Analytics = {
  /** Unique pageviews: each page counted once per visit (a garden's panel counts as that garden's page). */
  pageviews: { uniqueTotal: number; viewsTotal: number; pages: { label: string; unique: number; views: number }[] };
  /** Approximate visit locations (connection-based, never device location). State and city for Australia only. */
  location: { australia: number; states: { label: string; visits: number }[]; cities: { label: string; visits: number }[]; otherCountries: { label: string; visits: number }[]; unknown: number };
  /** Visits with a tap in the last 5 and 30 minutes (taps only: a visitor reading quietly isn't counted). */
  activeNow: { last5: number; last30: number };
  since: string;
  until: string;
  visits: number;
  events: number;
  checkins: number;
  /** Visits that got this far, each step requiring the one before. */
  funnel: { label: string; visits: number }[];
  /** Share of all visits that did each thing at least once (not in order). */
  reach: { label: string; visits: number }[];
  exits: { label: string; visits: number }[];
  paths: { path: string; visits: number }[];
  medianVisitSeconds: number | null;
  medianSecondsToFirstGarden: number | null;
  perSite: { name: string; opened: number; directions: number; questions: number; checkins: number; joins: number }[];
  joinByPlacement: { label: string; taps: number }[];
  checkinsByMode: { label: string; count: number }[];
  favourites: { name: string; count: number }[];
  commentCount: number;
  arrivals: { directionsTaps: number; arrivals: number };
  perDay: { day: string; visits: number }[];
  perHour: { hour: number; visits: number }[];
  friction: { label: string; visits: number; note: string }[];
  frustration: {
    /** Each signal: how many times, in how many visits (share of all visits). */
    signals: { label: string; hint: string; times: number; visits: number }[];
    /** Top "what" behind rage clicks, errors, slow things, cancelled leaving dialogs and declined questions. */
    byDetail: { signal: string; detail: string; times: number }[];
    /** Per garden: panel bounces, errors and the like that happened on that garden. */
    perSite: { name: string; bounces: number; problems: number }[];
    planAbandon: { stops: number; times: number }[];
    leaveCancel: number;
    leaveContinued: number;
  };
  devices: { label: string; visits: number }[];
  medianLoadMs: number | null;
  /** The pilot targets from the PRD. */
  kpi: { gardenOpen: number; logTap: number; joinTap: number; gardenVisits: number };
};

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};
const count = <T>(items: T[], key: (t: T) => string) => {
  const m = new Map<string, number>();
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
};
const day = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso)); // YYYY-MM-DD
const hour = (iso: string) => Number(new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(new Date(iso)));

export function computeAnalytics(rawEvents: EventRow[], rawCheckins: CheckinRow[], sites: SiteRef[], since: Date, now: Date = new Date()): Analytics {
  const events = rawEvents.filter((e) => e.device_id !== TEST_DEVICE).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const checkins = rawCheckins.filter((c) => c.device_id !== TEST_DEVICE && !c.is_test);
  const name = (id: string | null) => sites.find((s) => s.id === id)?.name ?? id ?? "?";

  // A visit = the per-tab session id (older rows without one: one visit per device per day).
  const visitsMap = new Map<string, EventRow[]>();
  for (const e of events) {
    const k = e.session_id ?? `${e.device_id}:${day(e.created_at)}`;
    if (!visitsMap.has(k)) visitsMap.set(k, []);
    visitsMap.get(k)!.push(e);
  }
  const visits = [...visitsMap.values()];
  /** The golden-path steps only (not the frustration or device signals). */
  const steps = (v: EventRow[]) => v.filter((e) => STEP_LABELS[e.event]);
  const t = (e: EventRow) => Date.parse(e.created_at);
  const has = (v: EventRow[], n: string) => v.some((e) => e.event === n);
  const checkedIn = (v: EventRow[]) =>
    checkins.some((c) => c.device_id === v[0].device_id && Date.parse(c.created_at) >= t(v[0]) - 1000 && Date.parse(c.created_at) <= t(v[v.length - 1]) + 60000);

  const garden = visits.filter((v) => has(v, "garden_view"));
  const gardenAndCheckin = garden.filter(checkedIn);
  const funnel = [
    { label: "Visited", visits: visits.length },
    { label: "Opened a garden", visits: garden.length },
    { label: "Checked in", visits: gardenAndCheckin.length },
    { label: "Then tapped Log or Join", visits: gardenAndCheckin.filter((v) => has(v, "log_tap") || has(v, "join_tap")).length },
  ];
  const reach = [
    "garden_view", "question", "directions_tap", "walk_open", "log_tap", "join_tap",
  ].map((n) => ({ label: STEP_LABELS[n], visits: visits.filter((v) => has(v, n)).length }));
  reach.push({ label: "Checked in", visits: visits.filter(checkedIn).length });

  const stepLabel = (e: EventRow) => (e.event === "page_open" && !isHome(e) ? PAGE_LABELS[e.detail ?? "other"] ?? "Page" : STEP_LABELS[e.event] ?? e.event);
  const collapse = (v: EventRow[]) => steps(v).map(stepLabel).filter((l, i, a) => i === 0 || l !== a[i - 1]);
  const paths = count(visits.filter((v) => steps(v).length > 0), (v) => { const p = collapse(v); return p.length > 6 ? p.slice(0, 6).join(" → ") + " → …" : p.join(" → "); })
    .slice(0, 10).map(([path, n]) => ({ path, visits: n }));
  const exits = count(visits, (v) => (steps(v).length ? stepLabel(steps(v)[steps(v).length - 1]) : "Other page (no steps)")).map(([label, n]) => ({ label, visits: n }));

  const lengths = visits.map((v) => (t(v[v.length - 1]) - t(v[0])) / 1000);
  const toGarden = garden.map((v) => {
    const open = v.find(isHome);
    return open ? (t(v.find((e) => e.event === "garden_view")!) - t(open)) / 1000 : NaN;
  }).filter((n) => !Number.isNaN(n));

  const perSite = sites.map((s) => {
    const ev = (n: string) => events.filter((e) => e.event === n && e.site_id === s.id).length;
    return { name: s.name, opened: ev("garden_view"), directions: ev("directions_tap"), questions: ev("question"), joins: ev("join_tap"), checkins: checkins.filter((c) => c.site_id === s.id).length };
  });

  const taps = events.filter((e) => e.event === "directions_tap" && e.site_id);
  const arrivals = checkins.filter((c) => taps.some((e) => e.device_id === c.device_id && e.site_id === c.site_id && t(e) <= Date.parse(c.created_at) && Date.parse(c.created_at) - t(e) <= 6 * 3600000)).length;

  const days = count(visits, (v) => day(v[0].created_at)).sort((a, b) => a[0].localeCompare(b[0]));
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, visits: visits.filter((v) => hour(v[0].created_at) === h).length }));

  const onlyMap = visits.filter((v) => steps(v).length > 0 && steps(v).every(isHome));
  const gardenBounce = garden.filter((v) => steps(v).every((e) => e.event === "page_open" || e.event === "garden_view") && !checkedIn(v));
  const wantedToGo = visits.filter((v) => has(v, "directions_tap") || has(v, "walk_open"));
  const friction = [
    { label: "Left from the map without opening a garden", visits: onlyMap.length, note: "Could be a slow map, or nothing tempting." },
    { label: "Opened a garden, then did nothing else", visits: gardenBounce.length, note: "The garden page may not answer what they came for." },
    { label: "Asked for directions or a walk but never checked in", visits: wantedToGo.filter((v) => !checkedIn(v)).length, note: "Not necessarily a problem: they may not have arrived yet." },
  ];

  const activeSince = (min: number) => visits.filter((v) => now.getTime() - t(v[v.length - 1]) <= min * 60000).length;

  const sig = (name: string) => events.filter((e) => e.event === name);
  const sigVisits = (name: string) => visits.filter((v) => has(v, name)).length;
  const SIGNALS: [string, string, string][] = [
    ["rage_click", "Repeated quick taps", "Someone tapped the same spot 3+ times in a second: something looked tappable but didn't respond, or was slow."],
    ["error", "Something failed", "App errors, chatbot fallbacks, check-in problems, location trouble, map tiles not loading."],
    ["slow", "Something was slow", "A chatbot answer took longer than 8 seconds."],
    ["panel_bounce", "Opened a site and closed it within 2 s", "They didn't find what they expected, or tapped by mistake."],
    ["site_flip", "Opened 3+ different sites within 15 s", "Hunting for something and not finding it."],
    ["leave_cancel", "Cancelled the “You're leaving” box", "They changed their mind about leaving the guide."],
    ["plan_abandon", "Picked stops in Plan but never opened the walk", "The planning step lost them."],
    ["search_empty", "A search found nothing", "They looked for a garden we don't have, or mistyped."],
    ["chat_declined", "The chatbot declined a question", "They asked something outside what it can answer."],
  ];
  const byDetail = events
    .filter((e) => ["rage_click", "error", "slow", "leave_cancel", "chat_declined"].includes(e.event))
    .reduce((m, e) => m.set(`${e.event}|${e.detail ?? "(none)"}`, (m.get(`${e.event}|${e.detail ?? "(none)"}`) ?? 0) + 1), new Map<string, number>());
  const loads = sig("visit_info").map((e) => e.value).filter((n): n is number => typeof n === "number" && n > 0);
  const problemEvents = ["rage_click", "error", "slow", "chat_declined"];

  const pageMap = new Map<string, { views: number; visits: Set<number> }>();
  visits.forEach((v, i) => {
    for (const e of v) {
      const label = e.event === "page_open" ? PAGE_LABELS[e.detail ?? "home"] ?? "Other page" : e.event === "garden_view" && e.site_id ? `${name(e.site_id)} (garden)` : null;
      if (!label) continue;
      const m = pageMap.get(label) ?? { views: 0, visits: new Set<number>() };
      m.views++;
      m.visits.add(i);
      pageMap.set(label, m);
    }
  });
  const pages = [...pageMap].map(([label, m]) => ({ label, unique: m.visits.size, views: m.views })).sort((a, b) => b.unique - a.unique);

  const countries = new Intl.DisplayNames(["en"], { type: "region" });
  const geo = visits.map((v) => v.find((e) => e.event === "visit_info" && e.country)).filter((e): e is EventRow => !!e);
  const au = geo.filter((e) => e.country === "AU");
  const location = {
    australia: au.length,
    states: count(au.filter((e) => e.region), (e) => STATES[e.region!] ?? e.region!).map(([label, n]) => ({ label, visits: n })),
    cities: count(au.filter((e) => e.city), (e) => e.city!).slice(0, 10).map(([label, n]) => ({ label, visits: n })),
    otherCountries: count(geo.filter((e) => e.country !== "AU"), (e) => countries.of(e.country!) ?? e.country!).map(([label, n]) => ({ label, visits: n })),
    unknown: visits.length - geo.length,
  };

  return {
    pageviews: { uniqueTotal: pages.reduce((n, p) => n + p.unique, 0), viewsTotal: pages.reduce((n, p) => n + p.views, 0), pages },
    location,
    frustration: {
      signals: SIGNALS.map(([k, label, hint]) => ({ label, hint, times: sig(k).length, visits: sigVisits(k) })),
      byDetail: [...byDetail].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ signal: STEP_LABELS[k.split("|")[0]] ?? k.split("|")[0].replace("_", " "), detail: k.split("|")[1], times: n })),
      perSite: sites.map((s) => ({
        name: s.name,
        bounces: events.filter((e) => e.event === "panel_bounce" && e.site_id === s.id).length,
        problems: events.filter((e) => problemEvents.includes(e.event) && e.site_id === s.id).length,
      })),
      planAbandon: count(sig("plan_abandon"), (e) => String(e.value ?? 0)).map(([stops, n]) => ({ stops: Number(stops), times: n })),
      leaveCancel: sig("leave_cancel").length,
      leaveContinued: sig("join_tap").length + sig("log_tap").length,
    },
    devices: count(sig("visit_info"), (e) => e.detail ?? "unknown").map(([label, n]) => ({ label, visits: n })),
    medianLoadMs: median(loads),
    activeNow: { last5: activeSince(5), last30: activeSince(30) },
    since: since.toISOString(), until: now.toISOString(),
    visits: visits.length, events: events.length, checkins: checkins.length,
    funnel, reach, exits, paths,
    medianVisitSeconds: median(lengths), medianSecondsToFirstGarden: median(toGarden),
    perSite,
    joinByPlacement: count(events.filter((e) => e.event === "join_tap"), (e) => e.placement ?? "(none)").map(([label, taps_]) => ({ label, taps: taps_ })),
    checkinsByMode: count(checkins, (c) => c.mode).map(([label, n]) => ({ label, count: n })),
    favourites: count(checkins.filter((c) => c.favourite_site_id), (c) => name(c.favourite_site_id)).map(([n, c]) => ({ name: n, count: c })),
    commentCount: checkins.filter((c) => c.comment).length,
    arrivals: { directionsTaps: taps.length, arrivals },
    perDay: days.map(([d, n]) => ({ day: d, visits: n })),
    perHour: hours,
    friction,
    kpi: { gardenOpen: garden.length, logTap: garden.filter((v) => has(v, "log_tap")).length, joinTap: garden.filter((v) => has(v, "join_tap")).length, gardenVisits: garden.length },
  };
}
