import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chatbot } from "@/components/chatbot";
import { CheckInCard } from "@/components/checkin-card";
import { DirectionsButtons } from "@/components/directions-buttons";
import { SightingGrid } from "@/components/sighting-grid";
import { SiteMiniMap } from "@/components/site-mini-map";
import { SiteStats, type MonthCount } from "@/components/site-stats";
import { JoinButtons, LogSightingButton } from "@/components/link-buttons";
import { GardenViewLogger } from "@/components/view-logger";
import { getSightingsFile, getSite, getSites, getSummaries } from "@/lib/content";
import { siteCentre } from "@/lib/sites";
import { computeFacts } from "@/lib/facts";
import { getSummary } from "@/lib/summary";
import { displayName } from "@/lib/sightings";

const SHOWN = 12; // photos in the grid (4 rows of 3)

/** The 12 months up to the latest data, oldest first, as short month names. */
function monthCounts(dates: string[], upTo: string): MonthCount[] {
  const end = new Date(`${upTo.slice(0, 7)}-01T00:00:00Z`);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (11 - i), 1));
    const key = d.toISOString().slice(0, 7);
    return { label: d.toLocaleString("en-AU", { month: "short", timeZone: "UTC" }), count: dates.filter((x) => x.startsWith(key)).length };
  });
}

/** Everything about one garden. Used by the full page (/sites/[id]) and the slide-out panel on the explorer. */
export async function GardenDetail({ id }: { id: string }) {
  const site = await getSite(id);
  if (!site) notFound();

  const centre = siteCentre(site);
  const [data, summaries, allSites] = await Promise.all([getSightingsFile(), getSummaries(), getSites()]);
  const facts = computeFacts(site.id, data);
  const summary = getSummary(site, facts, summaries[site.id]);
  const mine = data.sightings.filter((s) => s.siteId === site.id).sort((a, b) => b.observedOn.localeCompare(a.observedOn));
  const months = monthCounts(mine.map((s) => s.observedOn), data.dataUpTo);
  const photos = mine
    .filter((s) => s.photo)
    .slice(0, SHOWN)
    .map((s) => ({ id: s.id, url: s.url, photoUrl: s.photo!.url, name: displayName(s), date: s.observedOn, observer: s.observer, attribution: s.photo!.attribution }));

  return (
    <div className="space-y-4">
    <GardenViewLogger siteId={site.id} />
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold">{site.name}</h1>
      <p className="text-muted-foreground">
        {site.suburb} · {site.gardensNote ?? `${site.gardens} gardens`} · {site.areaM2} m²
      </p>
    </header>

    {site.note && (
      <p className="rounded-lg border bg-muted p-3 text-sm" role="note">
        {site.note}
      </p>
    )}

    <Card>
      <CardHeader>
        <CardTitle>Where</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SiteMiniMap name={site.name} points={site.addresses.map((a) => ({ lat: a.lat, lng: a.lng }))} />
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {site.addresses.map((a) => (
            <li key={a.label}>{a.label}</li>
          ))}
        </ul>
        <DirectionsButtons siteId={site.id} lat={centre.lat} lng={centre.lng} />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>About this garden</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm" data-slot="ai-summary">
        <p>{summary.text}</p>
        <p className="text-xs text-muted-foreground">
          {summary.source === "ai"
            ? `Written by AI from the sightings data, checked by code. Data up to ${summary.dataUpTo}.`
            : `Summary from the sightings data. Data up to ${summary.dataUpTo}.`}
        </p>
      </CardContent>
    </Card>

    <SiteStats facts={facts} months={months} />

    <CheckInCard siteId={site.id} sites={allSites.map((s) => ({ id: s.id, name: s.name }))} />

    <Card>
      <CardHeader>
        <CardTitle>Recent sightings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <SightingGrid items={photos} />
        <p className="text-xs text-muted-foreground">Data up to {data.dataUpTo}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Ask about this garden</CardTitle>
      </CardHeader>
      <CardContent>
        <Chatbot siteId={site.id} />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Get involved</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <LogSightingButton siteId={site.id} />
        <JoinButtons siteId={site.id} />
      </CardContent>
    </Card>
    </div>
  );
}
