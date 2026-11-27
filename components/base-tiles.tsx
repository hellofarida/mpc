"use client";

import { useRef, useState } from "react";
import { TileLayer } from "react-leaflet";
import { logEvent } from "@/lib/events";
import { initialProvider, rememberFallback, TILE_SOURCES, type Provider } from "@/lib/map-tiles";

const ERRORS_BEFORE_FALLBACK = 4;

/**
 * The base map. Uses CARTO's map (Voyager by default) when a key is set, and switches itself to OpenStreetMap's own tiles for the
 * rest of the visit if CARTO's tiles keep failing (blocked key, limit reached, outage), so the map never goes blank.
 * Tiles are requested only once a pan or zoom has finished, and no extra ring of tiles is kept around the view.
 */
export function BaseTiles() {
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const errors = useRef(0);
  const source = TILE_SOURCES[provider];
  return (
    <TileLayer
      key={provider}
      url={source.url}
      attribution={source.attribution}
      updateWhenIdle
      updateWhenZooming={false}
      keepBuffer={1}
      eventHandlers={{
        tileerror: () => {
          errors.current++;
          if (provider === "carto" && errors.current >= ERRORS_BEFORE_FALLBACK) {
            rememberFallback();
            errors.current = 0;
            setProvider("osm");
            logEvent("error", { detail: "tiles-fallback" });
          } else if (provider === "osm" && errors.current === 3) {
            logEvent("error", { detail: "tiles-failed" });
          }
        },
      }}
    />
  );
}
