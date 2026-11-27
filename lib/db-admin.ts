// Server-side WRITES to the content tables. For scripts only (never import from the app):
// it needs SUPABASE_SERVICE_ROLE_KEY, a secret that must never be in the browser or prefixed NEXT_PUBLIC_.
import { createClient } from "@supabase/supabase-js";
import {
  metaToRow, siteFromRow, siteToRow, sightingToRow, summaryFromRow, summaryToRow,
  type SightingRow, type SiteRow, type SummaryRow,
} from "./db-rows";
import type { SightingsFile } from "./sightings";
import type { Site } from "./sites";
import type { Summary } from "./summary";

export const hasAdminKey = () => !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function check(what: string, error: { message: string } | null) {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export async function pushSites(sites: Site[]) {
  check("sites", (await admin().from("sites").upsert(sites.map(siteToRow))).error);
  return sites.length;
}

/** Upserts the sightings, then removes rows that dropped out of the 12-month window. */
export async function pushSightings(file: SightingsFile) {
  const db = admin();
  const rows = file.sightings.map(sightingToRow);
  for (let i = 0; i < rows.length; i += 500) {
    check("sightings", (await db.from("sightings").upsert(rows.slice(i, i + 500))).error);
  }
  check("corridor_meta", (await db.from("corridor_meta").upsert(metaToRow(file))).error);
  const keep = new Set(rows.map((r) => r.id));
  const { data, error } = await db.from("sightings").select("id");
  check("sightings (list)", error);
  const stale = (data ?? []).map((r) => r.id as number).filter((id) => !keep.has(id));
  for (let i = 0; i < stale.length; i += 200) {
    check("sightings (delete)", (await db.from("sightings").delete().in("id", stale.slice(i, i + 200))).error);
  }
  return { saved: rows.length, removed: stale.length };
}

export async function pushSummaries(summaries: Record<string, Summary>) {
  const rows = Object.entries(summaries).map(([id, s]) => summaryToRow(id, s));
  check("summaries", (await admin().from("summaries").upsert(rows)).error);
  return rows.length;
}

// ---------- reads for the weekly refresh (same tables the app reads) ----------

async function readAll<T>(table: string, order: string): Promise<T[]> {
  const db = admin();
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select("*").order(order).range(from, from + 999);
    check(table, error);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

export async function readSites(): Promise<Site[]> {
  const rows = await readAll<SiteRow>("sites", "number");
  if (rows.length === 0) throw new Error("The sites table is empty. Run migration 002 and npm run db:seed first.");
  return rows.map(siteFromRow);
}

/** Observation ids currently saved, per site. Used to see which sites changed. */
export async function readSightingIds(): Promise<Map<string, Set<number>>> {
  const out = new Map<string, Set<number>>();
  for (const r of await readAll<SightingRow>("sightings", "id")) {
    if (!out.has(r.site_id)) out.set(r.site_id, new Set());
    out.get(r.site_id)!.add(r.id);
  }
  return out;
}

export async function readSummaries(): Promise<Record<string, Summary>> {
  const { data, error } = await admin().from("summaries").select("*");
  check("summaries", error);
  return Object.fromEntries((data as SummaryRow[]).map((r) => [r.site_id, summaryFromRow(r)]));
}

// ---------- reads for the analytics report (events and check-ins are closed to visitors) ----------

export type EventRow = { event: string; site_id: string | null; maps_app: string | null; device_id: string; session_id: string | null; placement: string | null; detail: string | null; value: number | null; created_at: string };
export type CheckinRow = { site_id: string; mode: string; device_id: string; favourite_site_id: string | null; comment: string | null; created_at: string; is_test: boolean };

export async function readEventsSince(sinceIso: string): Promise<EventRow[]> {
  const db = admin();
  const out: EventRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("events").select("event,site_id,maps_app,device_id,session_id,placement,detail,value,created_at").gte("created_at", sinceIso).order("id").range(from, from + 999);
    check("events", error);
    out.push(...((data ?? []) as EventRow[]));
    if (!data || data.length < 1000) return out;
  }
}

export async function readCheckinsSince(sinceIso: string): Promise<CheckinRow[]> {
  const db = admin();
  const out: CheckinRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("checkins").select("site_id,mode,device_id,favourite_site_id,comment,created_at,is_test").gte("created_at", sinceIso).order("id").range(from, from + 999);
    check("checkins", error);
    out.push(...((data ?? []) as CheckinRow[]));
    if (!data || data.length < 1000) return out;
  }
}

/** Deletes raw events older than the given date. Returns how many rows went. Hand-run only (npm run analytics:prune). */
export async function pruneEventsBefore(beforeIso: string, dryRun: boolean): Promise<number> {
  const db = admin();
  const { count, error } = await db.from("events").select("id", { count: "exact", head: true }).lt("created_at", beforeIso);
  check("events (count)", error);
  if (!dryRun && (count ?? 0) > 0) check("events (delete)", (await db.from("events").delete().lt("created_at", beforeIso)).error);
  return count ?? 0;
}
