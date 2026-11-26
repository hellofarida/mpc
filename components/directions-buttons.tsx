"use client";

import { buttonVariants } from "@/components/ui/button";
import { logEvent } from "@/lib/events";
import { appleDirectionsUrl, googleDirectionsUrl } from "@/lib/walk";

export function DirectionsButtons({ siteId, lat, lng }: { siteId: string; lat: number; lng: number }) {
  const p = { lat, lng };
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <a
          href={googleDirectionsUrl(p)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "default" })}
          onClick={() => logEvent("directions_tap", { siteId, mapsApp: "google" })}
        >
          Directions: Google Maps
        </a>
        <a
          href={appleDirectionsUrl(p)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
          onClick={() => logEvent("directions_tap", { siteId, mapsApp: "apple" })}
        >
          Apple Maps
        </a>
      </div>
      <p className="text-xs text-muted-foreground">Opens Google Maps or Apple Maps. Walking directions to the garden.</p>
    </div>
  );
}
