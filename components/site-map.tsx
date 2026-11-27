"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { pinIcon } from "@/components/pin-icon";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Tooltip, ZoomControl, useMap } from "react-leaflet";
import { BaseTiles } from "@/components/base-tiles";
import { MAP_LIMITS } from "@/lib/map-tiles";
import type { RouteFile, RouteMode, RouteVariant } from "@/lib/route";
import { siteCentre, type Site } from "@/lib/sites";

const LIST_PX = 412; // desktop: the floating list panel covers this much of the left of the map (12px gap + 400px)
const PANEL_PX = 460; // and the site panel next to it (448px + 12px gap)

type Props = { sites: Site[]; route: RouteFile; routeMode: RouteMode; chosen: RouteVariant | null; picked: string[]; panelOpen: boolean; onSelect: (id: string) => void };

export default function SiteMap({ sites, route, routeMode, chosen, picked, panelOpen, onSelect }: Props) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLive(true), 0);
    return () => {
      clearTimeout(t);
      setLive(false);
    };
  }, []);
  if (!live) return <div className="h-full w-full bg-muted" />;
  return <LeafletMap sites={sites} route={route} routeMode={routeMode} chosen={chosen} picked={picked} panelOpen={panelOpen} onSelect={onSelect} />;
}

/**
 * Centres the highlighted site(s) in the part of the map you can actually see: on desktop the open panel covers
 * the left part of the map, so that part is left out. One site: centre it. Several (plan mode): fit them all.
 */
function Focus({ sites, ids, panelOpen }: { sites: Site[]; ids: string[]; panelOpen: boolean }) {
  const map = useMap();
  const key = ids.join(",");
  useEffect(() => {
    const pts = key
      .split(",")
      .map((id) => sites.find((x) => x.id === id))
      .filter((x) => !!x)
      .map((x) => siteCentre(x!));
    if (pts.length === 0) return;
    const desktop = window.innerWidth >= 768;
    const inset = desktop ? LIST_PX + (panelOpen ? PANEL_PX : 0) : 0;
    if (pts.length === 1) {
      const z = Math.max(map.getZoom(), 15);
      const p = map.project([pts[0].lat, pts[0].lng], z).subtract([inset / 2, 0]);
      map.flyTo(map.unproject(p, z), z, { duration: 0.5 });
    } else {
      map.flyToBounds(L.latLngBounds(pts.map((c) => [c.lat, c.lng] as [number, number])), {
        paddingTopLeft: [inset + 48, desktop ? 96 : 48],
        paddingBottomRight: [48, 48],
        maxZoom: 16,
        duration: 0.5,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-centre when the picked sites or panel change
  }, [key, panelOpen, map]);
  return null;
}

function LeafletMap({ sites, route, routeMode, chosen, picked, panelOpen, onSelect }: Props) {
  const desktop = window.innerWidth >= 768; // this map only ever renders in the browser
  return (
    <MapContainer
      bounds={L.latLngBounds(sites.map((s) => { const c = siteCentre(s); return [c.lat, c.lng] as [number, number]; }))}
      boundsOptions={{ paddingTopLeft: [desktop ? LIST_PX + 40 : 40, desktop ? 96 : 40], paddingBottomRight: [40, 40] }}
      zoomControl={false}
      zoomSnap={0.25}
      minZoom={MAP_LIMITS.minZoom}
      maxZoom={MAP_LIMITS.maxZoom}
      maxBounds={MAP_LIMITS.maxBounds}
      maxBoundsViscosity={1}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <BaseTiles />
      <ZoomControl position="bottomright" />
      {routeMode !== "off" && (
        <Polyline
          positions={(chosen ?? route.variants[routeMode]).coords}
          pathOptions={{ color: routeMode === "walking" ? "#3b6d11" : "#185fa5", weight: 4, opacity: 0.85, dashArray: routeMode === "walking" ? "2 8" : undefined, lineCap: "round" }}
        />
      )}
      {routeMode !== "off" && !chosen &&
        [route.waypoints[0], route.waypoints[route.waypoints.length - 1]].map((w, i) => (
          <CircleMarker key={w.name} center={[w.lat, w.lng]} radius={6} pathOptions={{ color: "#fff", weight: 2, fillColor: i === 0 ? "#3b6d11" : "#185fa5", fillOpacity: 1 }}>
            <Tooltip direction="top" offset={[0, -6]} permanent={false}>
              {i === 0 ? "Start: " : "End: "}
              {w.name}
            </Tooltip>
          </CircleMarker>
        ))}
      <Focus sites={sites} ids={picked} panelOpen={panelOpen} />
      {sites.map((s) => {
        const c = siteCentre(s);
        return (
          <Marker
            key={s.id}
            position={[c.lat, c.lng]}
            icon={pinIcon(picked.includes(s.id))}
            title={s.name}
            zIndexOffset={picked.includes(s.id) ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(s.id) }}
          />
        );
      })}
    </MapContainer>
  );
}
