"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { logEvent } from "@/lib/events";
import { SITES, sortWestToEast } from "@/lib/sites";
import { MAX_STOPS, MIN_STOPS, buildAppleWalkUrl, buildGoogleWalkUrl } from "@/lib/walk";

export function WalkPlanner({ here }: { here: { lat: number; lng: number } | null }) {
  const [picked, setPicked] = useState<string[]>([]);
  const stops = sortWestToEast(SITES.filter((s) => picked.includes(s.id)));
  const ready = stops.length >= MIN_STOPS && stops.length <= MAX_STOPS;
  const google = buildGoogleWalkUrl(stops, here);
  const apple = buildAppleWalkUrl(stops);
  const ids = stops.map((s) => s.id);

  function toggle(id: string, on: boolean) {
    setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan my walk</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">Tick {MIN_STOPS} to {MAX_STOPS} gardens. We&apos;ll order them west to east.</p>
        <ul className="space-y-2">
          {SITES.map((s) => {
            const checked = picked.includes(s.id);
            const disabled = !checked && picked.length >= MAX_STOPS;
            return (
              <li key={s.id}>
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => toggle(s.id, v)} />
                  {s.number}. {s.name}
                </label>
              </li>
            );
          })}
        </ul>
        {ready && google && apple ? (
          <div className="space-y-2">
            <p className="text-sm">
              Order: {stops.map((s) => s.name).join(" → ")}
              {here ? " (starting from where you are)" : ""}
            </p>
            <a
              href={google}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "default" })}
              onClick={() => logEvent("walk_open", { stops: ids, mapsApp: "google" })}
            >
              Open walk in Google Maps
            </a>
            <div>
              <a
                href={apple}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
                onClick={() => logEvent("walk_open", { stops: ids, mapsApp: "apple" })}
              >
                Apple Maps: first stop only
              </a>
              <p className="mt-1 text-xs text-muted-foreground">
                Apple Maps can only route between two points, so it opens directions to the first stop ({stops[0].name}).
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Opens Google Maps or Apple Maps.</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Pick at least {MIN_STOPS} gardens to see your walk.</p>
        )}
      </CardContent>
    </Card>
  );
}
