"use client";

import { supabase } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/device";
import { getSessionId } from "@/lib/session";

export type EventName =
  | "page_open"
  | "garden_view"
  | "question"
  | "log_tap"
  | "join_tap"
  | "directions_tap"
  | "walk_open"
  // frustration and performance signals (see supabase/migrations/004_frustration_events.sql)
  | "rage_click"
  | "error"
  | "slow"
  | "panel_bounce"
  | "site_flip"
  | "leave_cancel"
  | "plan_abandon"
  | "search_empty"
  | "chat_declined"
  | "visit_info";

export type EventExtras = {
  siteId?: string;
  mapsApp?: "google" | "apple";
  stops?: string[]; // walk_open only: 2–8 site IDs
  placement?: string; // where a tap happened, e.g. "garden-join" (lowercase letters, digits, dashes)
  detail?: string; // a short fixed code, e.g. "site-card" or "geo-denied": never free text
  value?: number; // a small number, e.g. milliseconds
  country?: string; // visit_info only: approximate area of the connection (state and city only for Australia)
  region?: string;
  city?: string;
};

// ---------- batching: events wait in a small queue and go in ONE request ----------
const FLUSH_AFTER_MS = 10_000; // send at most every 10 seconds ...
const FLUSH_AT = 10; // ... or as soon as 10 are waiting ...
const MAX_PER_VISIT = 60; // ... and never more than this many in one visit
const IGNORE_REPEAT_MS = 3000; // the same event again within this long is dropped
const COUNT_KEY = "mpc-event-count";

type Row = {
  event: EventName; site_id: string | null; maps_app: string | null; stops: string[] | null; placement: string | null;
  detail: string | null; value: number | null; country: string | null; region: string | null; city: string | null;
  device_id: string; session_id: string;
};
let queue: Row[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let installed = false;
const recent = new Map<string, number>();

function visitCount(): number {
  try { return Number(sessionStorage.getItem(COUNT_KEY) ?? "0"); } catch { return 0; }
}
function setVisitCount(n: number) {
  try { sessionStorage.setItem(COUNT_KEY, String(n)); } catch { /* storage blocked: the in-memory queue still works */ }
}

/** Send everything waiting, in one request. keepalive lets it finish even while the tab is closing. */
export function flushEvents(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (queue.length === 0) return;
  const rows = queue;
  queue = [];
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  void fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(rows),
    keepalive: true,
  })
    .then(async (res) => {
      if (!res.ok && process.env.NODE_ENV !== "production") console.warn("events not saved", res.status, await res.text());
    })
    .catch(() => {});
}

function install() {
  if (installed) return;
  installed = true;
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushEvents());
  window.addEventListener("pagehide", flushEvents);
}

/**
 * Record one step or signal. Fire-and-forget: it never throws and never blocks the visitor. Stores only the event,
 * the garden, the time, a short fixed code and the anonymous device and visit ids.
 */
export function logEvent(event: EventName, extras: EventExtras = {}): void {
  if (typeof window === "undefined") return;
  install();

  const dedupKey = [event, extras.siteId, extras.detail, extras.placement, extras.stops?.join("+")].join("|");
  const now = Date.now();
  if (now - (recent.get(dedupKey) ?? 0) < IGNORE_REPEAT_MS) return;
  recent.set(dedupKey, now);

  const n = visitCount();
  if (n >= MAX_PER_VISIT) return;
  setVisitCount(n + 1);

  queue.push({
    event,
    site_id: extras.siteId ?? null,
    maps_app: extras.mapsApp ?? null,
    stops: extras.stops ?? null,
    placement: extras.placement ?? null,
    detail: extras.detail ?? null,
    value: extras.value === undefined ? null : Math.max(0, Math.min(3_600_000, Math.round(extras.value))),
    country: extras.country ?? null,
    region: extras.region ?? null,
    city: extras.city ?? null,
    device_id: getDeviceId(),
    session_id: getSessionId(),
  });
  if (n + 1 === MAX_PER_VISIT) queue.push({ ...queue[queue.length - 1], event: "error", site_id: null, maps_app: null, stops: null, placement: null, detail: "event-cap", value: MAX_PER_VISIT, country: null, region: null, city: null });
  if (queue.length >= FLUSH_AT) flushEvents();
  else timer ??= setTimeout(flushEvents, FLUSH_AFTER_MS);
}

export type TravelMode = "walked" | "cycled" | "ran" | "other";

/** One-tap check-in. Returns "saved", "repeat" (ignored: same garden within an hour) or "error". */
export async function checkIn(siteId: string, mode: TravelMode): Promise<"saved" | "repeat" | "error"> {
  const { data, error } = await supabase().rpc("check_in", {
    p_site_id: siteId,
    p_mode: mode,
    p_device_id: getDeviceId(),
  });
  if (error) return "error";
  return data === true ? "saved" : "repeat";
}

/**
 * Optional extras after a check-in: favourite garden and a one-line comment. Returns "saved", "none" (nothing to
 * update: no recent check-in or already filled) or "error" (for example a comment the database refuses).
 */
export async function checkinDetails(
  siteId: string,
  favouriteSiteId: string | null,
  comment: string | null,
): Promise<"saved" | "none" | "error"> {
  const { data, error } = await supabase().rpc("checkin_details", {
    p_site_id: siteId,
    p_device_id: getDeviceId(),
    p_favourite_site_id: favouriteSiteId,
    p_comment: comment,
  });
  if (error) return "error";
  return data === true ? "saved" : "none";
}
