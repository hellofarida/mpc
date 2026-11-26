// The app's content (gardens, sightings, summaries) comes from the Supabase database, read with the PUBLIC key:
// those tables are read-only for visitors. Results are cached by Next ("use cache") and refreshed when the
// "content" tag is revalidated (the weekly refresh job will do that). If the database can't be reached, the
// bundled snapshot in data/*.json is used for a minute so the site still works; a warning is logged.
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import snapshotSightings from "@/data/sightings.json";
import snapshotSummaries from "@/data/summaries.json";
import {
  metaFromRow, siteFromRow, sightingFromRow, summaryFromRow,
  type MetaRow, type SightingRow, type SiteRow, type SummaryRow,
} from "./db-rows";
import type { SightingsFile } from "./sightings";
import { SITES, type Site } from "./sites";
import type { Summary, SummariesFile } from "./summary";

const FALLBACK_LIFE = { stale: 30, revalidate: 60, expire: 300 };

function reader() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** PostgREST returns at most 1000 rows a request, so read in pages. */
async function allRows<T>(table: string, order: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await reader().from(table).select("*").order(order).order("id").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data as T[]));
    if (!data || data.length < 1000) return out;
  }
}

export async function getSites(): Promise<Site[]> {
  "use cache";
  cacheTag("content");
  try {
    const rows = await allRows<SiteRow>("sites", "number");
    if (rows.length === 0) throw new Error("sites table is empty");
    cacheLife("hours");
    return rows.map(siteFromRow);
  } catch (e) {
    console.warn(`[content] using bundled sites: ${e instanceof Error ? e.message : e}`);
    cacheLife(FALLBACK_LIFE);
    return SITES;
  }
}

export async function getSite(id: string): Promise<Site | undefined> {
  return (await getSites()).find((s) => s.id === id);
}

export async function getSightingsFile(): Promise<SightingsFile> {
  "use cache";
  cacheTag("content");
  try {
    const { data: meta, error } = await reader().from("corridor_meta").select("*").eq("id", 1).maybeSingle();
    if (error || !meta) throw new Error(error?.message ?? "corridor_meta is empty");
    const rows = await allRows<SightingRow>("sightings", "observed_on");
    cacheLife("hours");
    return metaFromRow(meta as MetaRow, rows.map(sightingFromRow));
  } catch (e) {
    console.warn(`[content] using bundled sightings: ${e instanceof Error ? e.message : e}`);
    cacheLife(FALLBACK_LIFE);
    return snapshotSightings as SightingsFile;
  }
}

export async function getSummaries(): Promise<Record<string, Summary>> {
  "use cache";
  cacheTag("content");
  try {
    const { data, error } = await reader().from("summaries").select("*");
    if (error) throw new Error(error.message);
    cacheLife("hours");
    return Object.fromEntries((data as SummaryRow[]).map((r) => [r.site_id, summaryFromRow(r)]));
  } catch (e) {
    console.warn(`[content] using bundled summaries: ${e instanceof Error ? e.message : e}`);
    cacheLife(FALLBACK_LIFE);
    return (snapshotSummaries as SummariesFile).summaries;
  }
}
