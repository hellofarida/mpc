// npm run test:db — checks the Supabase rules using only the public key.
// Its test check-in uses device 00000000-0000-4000-8000-000000007e57 (delete with the SQL in README).
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const dev = "00000000-0000-4000-8000-00000000test".replace("test", "7e57");
const site = "napier-st-gardens";
const r = [];
const t = (name, pass, detail="") => r.push(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
let x;
x = await sb.from("events").insert({ event: "page_open", device_id: dev }); t("add a valid event", !x.error, x.error?.message);
x = await sb.from("events").insert({ event: "walk_open", stops: ["napier-st-gardens", "101-cobden-st"], device_id: dev }); t("add a walk_open with 2 stops", !x.error, x.error?.message);
x = await sb.from("events").insert({ event: "hack", device_id: dev }); t("reject an unknown event name", !!x.error, x.error?.message);
x = await sb.from("events").insert({ event: "garden_view", site_id: "fake-site", device_id: dev }); t("reject an unknown site", !!x.error, x.error?.message);
x = await sb.from("events").insert({ event: "walk_open", stops: ["napier-st-gardens","101-cobden-st","bank-st-1st-site","bank-st-2nd-site","port-melbourne-primary"], device_id: dev }); t("add a walk_open with 5 stops (needs 002)", !x.error, x.error?.message);
x = await sb.from("events").insert({ event: "walk_open", stops: ["napier-st-gardens","101-cobden-st","bank-st-1st-site","bank-st-2nd-site","port-melbourne-primary","st-martins-youth-arts-centre"], device_id: dev }); t("reject a walk with 6 stops", !!x.error, x.error?.message);
x = await sb.from("events").select("*"); t("can't read events", !!x.error || x.data.length === 0, x.error?.message ?? `${x.data.length} rows`);
x = await sb.from("events").delete().eq("device_id", dev).select(); t("can't delete events", !!x.error || x.data.length === 0, x.error?.message ?? `${x.data?.length} rows`);
x = await sb.from("checkins").insert({ site_id: site, mode: "walked", device_id: dev }); t("can't add check-ins directly", !!x.error, x.error?.message);
x = await sb.from("checkins").select("*"); t("can't read check-ins", !!x.error || x.data.length === 0, x.error?.message ?? `${x.data.length} rows`);
x = await sb.rpc("check_in", { p_site_id: site, p_mode: "walked", p_device_id: dev }); t("first check-in saved", x.data === true, x.error?.message ?? String(x.data));
x = await sb.rpc("check_in", { p_site_id: site, p_mode: "cycled", p_device_id: dev }); t("repeat within an hour ignored", x.data === false, x.error?.message ?? String(x.data));
x = await sb.rpc("check_in", { p_site_id: site, p_mode: "flew", p_device_id: "00000000-0000-4000-8000-000000000001" }); t("reject an unknown travel mode", !!x.error, x.error?.message);
x = await sb.rpc("checkin_totals", { p_site_id: site, p_from: "2026-01-01", p_to: "2027-01-01" }); t("totals only from checkin_totals", !x.error && x.data.every(row => Object.keys(row).sort().join() === "mode,total"), x.error?.message ?? JSON.stringify(x.data));
// content tables (002): public read-only
for (const table of ["sites", "sightings", "summaries", "corridor_meta"]) {
  x = await sb.from(table).select("*").limit(1); t(`can read ${table}`, !x.error && x.data.length === 1, x.error?.message ?? `${x.data?.length} rows`);
}
x = await sb.from("sites").insert({ id: "evil", number: 99, name: "x", suburb: "x", gardens: 1, area_m2: 1, addresses: [] }); t("can't add a site", !!x.error, x.error?.message);
x = await sb.from("sites").update({ name: "hacked" }).eq("id", site).select(); t("can't edit a site", !!x.error || x.data.length === 0, x.error?.message ?? `${x.data?.length} rows`);
x = await sb.from("sightings").delete().neq("id", 0).select(); t("can't delete sightings", !!x.error || x.data.length === 0, x.error?.message ?? `${x.data?.length} rows`);
x = await sb.from("summaries").update({ text: "hacked" }).eq("site_id", site).select(); t("can't edit a summary", !!x.error || x.data.length === 0, x.error?.message ?? `${x.data?.length} rows`);
x = await sb.from("corridor_meta").update({ source: "hacked" }).eq("id", 1).select(); t("can't edit corridor_meta", !!x.error || x.data.length === 0, x.error?.message ?? `${x.data?.length} rows`);
// fuller check-in (003): details only for your own recent check-in, once, and never personal-looking text
x = await sb.rpc("checkin_details", { p_site_id: site, p_device_id: "00000000-0000-4000-8000-0000000000dd", p_favourite_site_id: "101-cobden-st", p_comment: "hi" }); t("details need a recent check-in of your own (003)", x.data === false, x.error?.message ?? String(x.data));
x = await sb.rpc("checkin_details", { p_site_id: site, p_device_id: dev, p_favourite_site_id: null, p_comment: "email me at a@b.com" }); t("details with an email are refused or ignored (003)", !!x.error || x.data === false, x.error?.message ?? String(x.data));
x = await sb.from("checkins").select("comment"); t("can't read comments", !!x.error || x.data.length === 0, x.error?.message ?? `${x.data.length} rows`);
x = await sb.from("events").insert({ event: "page_open", device_id: dev, session_id: crypto.randomUUID(), placement: "garden-join" }); t("event with session and placement (003)", !x.error, x.error?.message);
x = await sb.from("events").insert({ event: "page_open", device_id: dev, placement: "Bad Tag!" }); t("reject a bad placement tag (003)", !!x.error, x.error?.message);
console.log(r.join("\n"));
