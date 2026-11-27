import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BeeSpinner } from "@/components/bee-spinner";
import { PlanView } from "@/components/plan-modal";
import { getSites } from "@/lib/content";
import type { RouteFile } from "@/lib/route";
import type { SiteImage } from "@/lib/site-images";
import { sortWestToEast } from "@/lib/sites";
import { MAX_STOPS, MIN_STOPS } from "@/lib/walk";
import imagesData from "@/data/site-images.json";
import routeData from "@/data/route.json";

export const metadata: Metadata = { title: "Your plan – MPC guide", robots: { index: false } };

export default function PlanPage({ searchParams }: { searchParams: Promise<{ stops?: string | string[] }> }) {
  return (
    <Suspense fallback={<BeeSpinner />}>
      <Plan searchParams={searchParams} />
    </Suspense>
  );
}

/** Every site in a plan on one page: /plan?stops=site-id,site-id,... Opened from "Your plan" in a new tab. */
async function Plan({ searchParams }: { searchParams: Promise<{ stops?: string | string[] }> }) {
  const raw = (await searchParams).stops;
  const ids = [...new Set((Array.isArray(raw) ? raw.join(",") : raw ?? "").split(",").map((x) => x.trim()).filter(Boolean))];
  const all = await getSites();
  const stops = sortWestToEast(all.filter((s) => ids.includes(s.id))).slice(0, MAX_STOPS);

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-4">
      <Link href="/" className="block text-sm underline">
        ← Back to the map
      </Link>
      <h1 className="text-2xl font-semibold">Your plan</h1>
      {stops.length < MIN_STOPS ? (
        <p className="text-sm">
          This plan needs at least {MIN_STOPS} sites. Pick some on the map, then choose View plan.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{stops.length} stops, west to east</p>
          <PlanView stops={stops} route={routeData as unknown as RouteFile} images={imagesData as Record<string, SiteImage>} linkSites />
        </>
      )}
    </main>
  );
}
