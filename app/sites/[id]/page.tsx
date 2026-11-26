import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckInCard } from "@/components/checkin-card";
import { DirectionsButtons } from "@/components/directions-buttons";
import { LeaveLink } from "@/components/leave-link";
import { JoinButtons, LogSightingButton } from "@/components/link-buttons";
import { GardenViewLogger } from "@/components/view-logger";
import { SITES, getSite, siteCentre } from "@/lib/sites";
import { displayName, type SightingsFile } from "@/lib/sightings";
import sightingsData from "@/data/sightings.json";

const data = sightingsData as SightingsFile;
const SHOWN = 12;

export function generateStaticParams() {
  return SITES.map((s) => ({ id: s.id }));
}

export default function GardenPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-4 text-sm">Loading…</p>}>
      <Garden params={params} />
    </Suspense>
  );
}

async function Garden({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = getSite(id);
  if (!site) notFound();

  const centre = siteCentre(site);
  const sightings = data.sightings
    .filter((s) => s.siteId === site.id)
    .sort((a, b) => b.observedOn.localeCompare(a.observedOn))
    .slice(0, SHOWN);

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 p-4">
      <GardenViewLogger siteId={site.id} />
      <Link href="/" className="text-sm underline">
        ← Map
      </Link>
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
        <CardContent className="text-sm text-muted-foreground">
          {/* Section 3: AI summary goes here */}
          <div data-slot="ai-summary">Summary coming soon.</div>
        </CardContent>
      </Card>

      <CheckInCard siteId={site.id} />

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
        <CardContent className="text-sm text-muted-foreground">
          {/* Section 4: chatbot goes here */}
          <div data-slot="chatbot">Coming soon.</div>
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
    </main>
  );
}
