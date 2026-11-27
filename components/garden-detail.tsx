import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chatbot } from "@/components/chatbot";
import { CheckInCard } from "@/components/checkin-card";
import { DirectionsButtons } from "@/components/directions-buttons";
import { LeaveLink } from "@/components/leave-link";
import { JoinButtons, LogSightingButton } from "@/components/link-buttons";
import { GardenViewLogger } from "@/components/view-logger";
import { getSightingsFile, getSite, getSites, getSummaries } from "@/lib/content";
import { siteCentre } from "@/lib/sites";
import { computeFacts } from "@/lib/facts";
import { getSummary } from "@/lib/summary";
import { displayName } from "@/lib/sightings";
const SHOWN = 12;

/** Everything about one garden. Used by the full page (/sites/[id]) and the slide-out panel on the explorer. */
export async function GardenDetail({ id }: { id: string }) {
  const site = await getSite(id);
  if (!site) notFound();

  const centre = siteCentre(site);
  const [data, summaries, allSites] = await Promise.all([getSightingsFile(), getSummaries(), getSites()]);
  const summary = getSummary(site, computeFacts(site.id, data), summaries[site.id]);
  const sightings = data.sightings
    .filter((s) => s.siteId === site.id)
    .sort((a, b) => b.observedOn.localeCompare(a.observedOn))
    .slice(0, SHOWN);

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

    <CheckInCard siteId={site.id} sites={allSites.map((s) => ({ id: s.id, name: s.name }))} />

    <Card>
      <CardHeader>
        <CardTitle>Recent sightings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sightings.length === 0 ? (
          <p className="text-sm">No sightings yet. Be the first!</p>
        ) : (
          <ul className="space-y-4">
            {sightings.map((s) => (
              <li key={s.id} className="flex gap-3">
                {s.photo && (
                  // Hot-linked from iNaturalist on purpose: photos are never copied (CC BY-NC).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.photo.url}
                    alt={displayName(s)}
                    width={80}
                    height={80}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="size-20 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 space-y-0.5 text-sm">
                  <p className="font-medium">{displayName(s)}</p>
                  <p className="text-muted-foreground">
                    {s.observedOn} · observed by {s.observer}
                  </p>
                  {s.photo && <p className="text-xs text-muted-foreground">Photo: {s.photo.attribution}</p>}
                  <LeaveLink
                    href={s.url}
                    destination="iNaturalist (original observation)"
                    variant="link"
                    className="h-auto p-0 text-xs"
                  >
                    See the original
                  </LeaveLink>
                </div>
              </li>
            ))}
          </ul>
        )}
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
