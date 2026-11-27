import { notFound } from "next/navigation";
import { PlainCard as Card, PlainCardContent as CardContent, PlainCardHeader as CardHeader, PlainCardTitle as CardTitle } from "@/components/plain-card";
import { Chatbot } from "@/components/chatbot";
import { CheckInButton } from "@/components/checkin-button";
import { DirectionsButtons } from "@/components/directions-buttons";
import { LogSightingButton } from "@/components/link-buttons";
import { SightingGrid } from "@/components/sighting-grid";
import { SiteHero } from "@/components/site-hero";
import { SiteTabs } from "@/components/site-tabs";
import { SiteMiniMap } from "@/components/site-mini-map";
import { SiteStats, type MonthCount } from "@/components/site-stats";
import { GardenViewLogger } from "@/components/view-logger";
import { getSightingsFile, getSite, getSites, getSummaries } from "@/lib/content";
import { GENERAL_NOTE, siteCentre } from "@/lib/sites";
import { computeFacts } from "@/lib/facts";
import { getSummary } from "@/lib/summary";
import { displayName } from "@/lib/sightings";
import type { SiteImage } from "@/lib/site-images";
import imagesData from "@/data/site-images.json";

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

  const image = (imagesData as Record<string, SiteImage>)[site.id];

  return (
    <div>
      <GardenViewLogger siteId={site.id} />
      <SiteHero image={image} />
      <header className="space-y-1.5 px-5 pt-6">
        <h1 className="text-2xl font-semibold">{site.name}</h1>
        <p className="text-muted-foreground">
          {site.suburb} · {site.gardensNote ?? `${site.gardens} gardens`} · {site.areaM2} m²
        </p>
      </header>

      <div className="flex gap-3 px-5 pt-5">
        <CheckInButton siteId={site.id} sites={allSites.map((s) => ({ id: s.id, name: s.name }))} />
        <LogSightingButton siteId={site.id} variant="outline" className="flex-1">
          Log sighting
        </LogSightingButton>
      </div>

      <SiteTabs
        tabs={[
          {
            id: "about",
            label: "About",
            content: (
              <>
                {site.note && site.note !== GENERAL_NOTE && (
                  <p className="rounded-lg bg-muted p-4 text-sm" role="note">
                    {site.note}
                  </p>
                )}

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

              </>
            ),
          },
          { id: "stats", label: "Stats", content: <SiteStats facts={facts} months={months} /> },
          {
            id: "sightings",
            label: "Sightings",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Recent sightings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <SightingGrid items={photos} />
                  <p className="text-xs text-muted-foreground">Data up to {data.dataUpTo}</p>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "chat",
            label: "Chat",
            fillToTallest: true,
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Ask about this garden</CardTitle>
                </CardHeader>
                <CardContent>
                  <Chatbot siteId={site.id} />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
