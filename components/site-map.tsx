"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer } from "react-leaflet";
import { SITES, siteCentre } from "@/lib/sites";

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
type Props = { here: Here; picked: string[]; onSelect: (id: string) => void };

export default function SiteMap({ here, picked, onSelect }: Props) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLive(true), 0);
    return () => {
      clearTimeout(t);
      setLive(false);
    };
  }, []);
  if (!live) return <div className="h-full w-full bg-muted" />;
  return <LeafletMap here={here} picked={picked} onSelect={onSelect} />;
}

function LeafletMap({ here, picked, onSelect }: Props) {
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
