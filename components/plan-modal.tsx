"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteThumb } from "@/components/site-thumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { logEvent } from "@/lib/events";
import { km, minutes, type RouteFile } from "@/lib/route";
import type { SiteImage } from "@/lib/site-images";
import type { Site } from "@/lib/sites";
import { buildAppleWalkUrl, buildGoogleWalkUrl } from "@/lib/walk";

/** Open the walk in Google Maps (all stops) or Apple Maps (first stop only). Used by the plan bar and the plan modal. */
export function WalkButtons({ stops, onOpened }: { stops: Site[]; onOpened: () => void }) {
  const google = buildGoogleWalkUrl(stops);
  const apple = buildAppleWalkUrl(stops);
  const ids = stops.map((s) => s.id);
  if (!google || !apple) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a
          href={google}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "default" })}
          onClick={() => {
            onOpened();
            logEvent("walk_open", { stops: ids, mapsApp: "google" });
          }}
        >
          Open in Google Maps
        </a>
        <a
          href={apple}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
          onClick={() => {
            onOpened();
            logEvent("walk_open", { stops: ids, mapsApp: "apple" });
          }}
        >
          Apple Maps
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        Apple Maps can only route between two points, so it opens directions to the first stop ({stops[0].name}).
      </p>
    </div>
  );
}

/**
 * Take the plan with you without us holding anything: the phone's own share sheet (message, email, notes...), a copy
 * of the link, or a ready-made email in the visitor's own mail app. The link holds the whole plan (/plan?stops=...).
 */
export function ShareButtons({ stops }: { stops: Site[] }) {
  const [note, setNote] = useState<string | null>(null);
  const link = () => `${window.location.origin}/plan?stops=${stops.map((s) => s.id).join(",")}`;
  const summary = () => `My walk through the Melbourne Pollinator Corridor: ${stops.map((s) => s.name).join(", then ")}.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link());
      setNote("Link copied.");
    } catch {
      setNote("Couldn't copy. Long-press the address bar to copy the link.");
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "My MPC walk", text: summary(), url: link() });
      } catch {
        /* closed the share sheet: nothing to do */
      }
    } else await copy(); // this browser has no share sheet: copy the link instead
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button data-track="plan-share" onClick={share}>
          Share
        </Button>
        <Button variant="outline" data-track="plan-copy" onClick={copy}>
          Copy link
        </Button>
        <Button
          variant="outline"
          data-track="plan-email"
          onClick={() => {
            const body = `${summary()}\n\n${stops.map((s, i) => `${i + 1}. ${s.name}, ${s.suburb}`).join("\n")}\n\n${link()}`;
            window.location.href = `mailto:?subject=${encodeURIComponent("My MPC walk")}&body=${encodeURIComponent(body)}`;
          }}
        >
          Email it
        </Button>
      </div>
      {note && (
        <p role="status" className="text-xs text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}

/** The plan itself: stops in order, the distance and time between them, and ways to take it with you. */
export function PlanView({
  stops,
  route,
  images,
  onOpened = () => {},
  onViewSite,
  linkSites = false,
}: {
  stops: Site[];
  route: RouteFile;
  images: Record<string, SiteImage>;
  onOpened?: () => void;
  onViewSite?: (id: string) => void; // in the pop-up: open that site's panel
  linkSites?: boolean; // on the plan page: link to that site's own page
}) {
  const [mode, setMode] = useState<"walking" | "cycling">("walking");
  const legs = stops.slice(1).map((s, i) => route.legs[stops[i].id]?.[s.id]?.[mode] ?? null);
  const known = legs.filter((l) => l !== null);
  const total = known.reduce((n, l) => ({ d: n.d + l.distanceM, s: n.s + l.durationS }), { d: 0, s: 0 });
  const verb = mode === "walking" ? "on foot" : "by bike";

  return (
    <div className="space-y-4">
      <div role="group" aria-label="How you'll travel" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
        {([["walking", "Walk"], ["cycling", "Cycle"]] as const).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-md py-1.5 font-medium ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <ol className="space-y-1">
        {stops.map((s, i) => (
          <li key={s.id}>
            <div className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <SiteThumb image={images[s.id]} className="size-12" />
              <span className="min-w-0 text-sm">
                <span className="block font-medium">{s.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{s.suburb}</span>
              </span>
              <span className="ml-auto shrink-0">
                {onViewSite ? (
                  <Button variant="outline" size="sm" data-track="plan-view-site" onClick={() => onViewSite(s.id)}>
                    View site
                  </Button>
                ) : linkSites ? (
                  <Link href={`/sites/${s.id}`} data-track="plan-view-site" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    View site
                  </Link>
                ) : null}
              </span>
            </div>
            {i < legs.length && (
              <p className="ml-3 border-l-2 border-dashed py-2 pl-6 text-xs text-muted-foreground">
                {legs[i] ? `${km(legs[i]!.distanceM)}, ${minutes(legs[i]!.durationS)} ${verb}` : "Distance not available"}
              </p>
            )}
          </li>
        ))}
      </ol>

      {known.length === legs.length && (
        <p className="rounded-lg bg-muted p-3 text-sm">
          <strong>Total:</strong> {km(total.d)}, about {minutes(total.s)} {verb}. Indicative, from OpenStreetMap paths.
        </p>
      )}

      <WalkButtons stops={stops} onOpened={onOpened} />
      <ShareButtons stops={stops} />
    </div>
  );
}

