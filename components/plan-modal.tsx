"use client";

import { useEffect, useState } from "react";
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

/** The chosen walk in one place: stops in order, the distance and time between them, and ways to take it with you. */
export function PlanModal({ stops, route, images, onClose, onOpened }: { stops: Site[]; route: RouteFile; images: Record<string, SiteImage>; onClose: () => void; onOpened: () => void }) {
  const [mode, setMode] = useState<"walking" | "cycling">("walking");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const legs = stops.slice(1).map((s, i) => route.legs[stops[i].id]?.[s.id]?.[mode] ?? null);
  const known = legs.filter((l) => l !== null);
  const total = known.reduce((n, l) => ({ d: n.d + l.distanceM, s: n.s + l.durationS }), { d: 0, s: 0 });
  const verb = mode === "walking" ? "on foot" : "by bike";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-title"
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[88dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-background p-4 shadow-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="plan-title" className="text-lg font-semibold">
              Your plan
            </h2>
            <p className="text-sm text-muted-foreground">{stops.length} stops, west to east</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} autoFocus>
            Close
          </Button>
        </div>

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

        <div className="border-t pt-3">
          <Button variant="outline" disabled>
            Email my plan
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">Coming soon.</p>
        </div>
      </div>
    </div>
  );
}
