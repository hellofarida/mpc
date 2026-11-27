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
const eight = ["south-melbourne-bee-gardens","101-cobden-st","napier-st-gardens","bank-st-1st-site","bank-st-2nd-site","st-martins-youth-arts-centre","melbourne-grammar-wadhurst","port-melbourne-primary"];
x = await sb.from("events").insert({ event: "walk_open", stops: eight, device_id: dev }); t("add a walk_open with all 8 stops (needs 005)", !x.error, x.error?.message);
x = await sb.from("events").insert({ event: "walk_open", stops: [...eight, "napier-st-gardens"], device_id: dev }); t("reject a walk with 9 stops", !!x.error, x.error?.message);
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
// frustration signals (004): fixed codes only, batch insert allowed
x = await sb.from("events").insert([{ event: "rage_click", device_id: dev, detail: "site-card" }, { event: "slow", device_id: dev, detail: "chat", value: 9000 }, { event: "visit_info", device_id: dev, detail: "phone" }]); t("batch insert of signals (004)", !x.error, x.error?.message);
x = await sb.from("events").insert({ event: "error", device_id: dev, detail: "User typed hello there" }); t("reject free text in detail (004)", !!x.error, x.error?.message);
x = await sb.from("events").insert({ event: "slow", device_id: dev, detail: "chat", value: -5 }); t("reject a negative value (004)", !!x.error, x.error?.message);
// visit location (006): country always, state and city only for Australia, only on visit_info
x = await sb.from("events").insert({ event: "visit_info", device_id: dev, detail: "phone", country: "AU", region: "VIC", city: "Melbourne" }); t("add a visit_info with an Australian state and city (006)", !x.error, x.error?.message);
x = await sb.from("events").insert({ event: "visit_info", device_id: dev, detail: "phone", country: "NZ", city: "Auckland" }); t("reject a city outside Australia (006)", !!x.error, x.error?.message);
x = await sb.from("events").insert({ event: "page_open", device_id: dev, country: "AU" }); t("reject a location on a page_open (006)", !!x.error, x.error?.message);
console.log(r.join("\n"));
