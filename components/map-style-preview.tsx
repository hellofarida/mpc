"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { pinIcon } from "@/components/pin-icon";
import { CARTO_STYLES, cartoTileUrl, TILE_SOURCES } from "@/lib/map-tiles";
import { SITES, siteCentre } from "@/lib/sites";

const PREVIEWS = [
  ...CARTO_STYLES.map((s) => ({ id: s.id, name: s.name, url: cartoTileUrl(s.id), credit: TILE_SOURCES.carto.attribution })),
  { id: "osm", name: "OpenStreetMap standard (what we had)", url: TILE_SOURCES.osm.url, credit: TILE_SOURCES.osm.attribution },
];

/** Development only: the same patch of the corridor in each style, with our pins, so you can pick one. */
export function MapStylePreview() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PREVIEWS.map((p) => (
        <figure key={p.id} className="space-y-1">
          <div className="h-72 overflow-hidden rounded-xl border">
            <MapContainer center={[-37.8345, 144.962]} zoom={14} className="h-full w-full" scrollWheelZoom={false}>
              <TileLayer url={p.url} attribution={p.credit} />
              {SITES.slice(0, 8).map((s) => {
                const c = siteCentre(s);
                return <Marker key={s.id} position={[c.lat, c.lng]} icon={pinIcon(false)} interactive={false} />;
              })}
            </MapContainer>
          </div>
          <figcaption className="text-sm">
            <strong>{p.name}</strong>
            {p.id !== "osm" && (
              <span className="text-muted-foreground">
                {" "}
                · set <code>NEXT_PUBLIC_CARTO_STYLE={p.id}</code>
              </span>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
