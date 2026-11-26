"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { SITES, getSite, siteCentre } from "@/lib/sites";

const PANEL_PX = 448; // the site panel (28rem) covers this much of the map on desktop

const icons = new Map<string, L.DivIcon>();
function pinIcon(n: number, picked: boolean) { // picked = highlighted: bigger, green, with a dark ring
  const key = `${n}-${picked}`;
  const cached = icons.get(key);
  if (cached) return cached;
  const icon = makeIcon(n, picked);
  icons.set(key, icon);
  return icon;
}

function makeIcon(n: number, on: boolean) {
  const size = on ? 38 : 28;
  const ring = on ? "box-shadow:0 0 0 3px #173404,0 2px 6px rgba(0,0,0,.6)" : "box-shadow:0 1px 4px rgba(0,0,0,.5)";
  return L.divIcon({
    className: "",
    html: `<div style="background:${on ? "#3b6d11" : "#b45309"};color:#fff;width:${size}px;height:${size}px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:600 ${on ? 16 : 13}px var(--font-instrument-sans),sans-serif;${ring}">${n}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

type Here = { lat: number; lng: number } | null;

/**
 * With cacheComponents the page is hidden (effects cleaned up) when you navigate away and shown again on Back.
 * Leaflet's map is destroyed by that cleanup and can't be reused, so mount a fresh one each time the page is visible.
 */
type Props = { here: Here; picked: string[]; panelOpen: boolean; onSelect: (id: string) => void };

export default function SiteMap({ here, picked, panelOpen, onSelect }: Props) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLive(true), 0);
    return () => {
      clearTimeout(t);
      setLive(false);
    };
  }, []);
  if (!live) return <div className="h-full w-full bg-muted" />;
  return <LeafletMap here={here} picked={picked} panelOpen={panelOpen} onSelect={onSelect} />;
}

/**
 * Centres the highlighted site(s) in the part of the map you can actually see: on desktop the open panel covers
 * the left part of the map, so that part is left out. One site: centre it. Several (plan mode): fit them all.
 */
function Focus({ ids, panelOpen }: { ids: string[]; panelOpen: boolean }) {
  const map = useMap();
  const key = ids.join(",");
  useEffect(() => {
    const pts = key
      .split(",")
      .map((id) => getSite(id))
      .filter((x) => !!x)
      .map((x) => siteCentre(x!));
    if (pts.length === 0) return;
    const inset = panelOpen && window.innerWidth >= 768 ? PANEL_PX : 0;
    if (pts.length === 1) {
      const z = Math.max(map.getZoom(), 15);
      const p = map.project([pts[0].lat, pts[0].lng], z).subtract([inset / 2, 0]);
      map.flyTo(map.unproject(p, z), z, { duration: 0.5 });
    } else {
      map.flyToBounds(L.latLngBounds(pts.map((c) => [c.lat, c.lng] as [number, number])), {
        paddingTopLeft: [inset + 48, 48],
        paddingBottomRight: [48, 48],
        maxZoom: 16,
        duration: 0.5,
      });
    }
  }, [key, panelOpen, map]);
  return null;
}

function LeafletMap({ here, picked, panelOpen, onSelect }: Props) {
  return (
    <MapContainer
      center={[-37.8345, 144.9695]}
      zoom={14}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Focus ids={picked} panelOpen={panelOpen} />
      {SITES.map((s) => {
        const c = siteCentre(s);
        return (
          <Marker
            key={s.id}
            position={[c.lat, c.lng]}
            icon={pinIcon(s.number, picked.includes(s.id))}
            title={s.name}
            zIndexOffset={picked.includes(s.id) ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(s.id) }}
          />
        );
      })}
      {here && (
        <CircleMarker
          center={[here.lat, here.lng]}
          radius={8}
          pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  );
}
