// Server-side WRITES to the content tables. For scripts only (never import from the app):
// it needs SUPABASE_SERVICE_ROLE_KEY, a secret that must never be in the browser or prefixed NEXT_PUBLIC_.
import { createClient } from "@supabase/supabase-js";
import { metaToRow, siteToRow, sightingToRow, summaryToRow } from "./db-rows";
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
