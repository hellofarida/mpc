"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { SITES, siteCentre } from "@/lib/sites";

function pinIcon(n: number) {
  return L.divIcon({
    className: "",
    html: `<div style="background:#b45309;color:#fff;width:28px;height:28px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:600 13px sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.5)">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

type Here = { lat: number; lng: number } | null;

/**
 * With cacheComponents the page is hidden (effects cleaned up) when you navigate away and shown again on Back.
 * Leaflet's map is destroyed by that cleanup and can't be reused, so mount a fresh one each time the page is visible.
 */
export default function SiteMap({ here }: { here: Here }) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLive(true), 0);
    return () => {
      clearTimeout(t);
      setLive(false);
    };
  }, []);
  if (!live) return <div className="h-80 w-full rounded-xl bg-muted" />;
  return <LeafletMap here={here} />;
}

function LeafletMap({ here }: { here: Here }) {
  return (
    <MapContainer
      center={[-37.8345, 144.9695]}
      zoom={14}
      scrollWheelZoom={false}
      className="h-80 w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {SITES.map((s) => {
        const c = siteCentre(s);
        return (
          <Marker key={s.id} position={[c.lat, c.lng]} icon={pinIcon(s.number)}>
            <Popup>
              <Link href={`/sites/${s.id}`} className="font-medium underline">
                {s.name}
              </Link>
            </Popup>
          </Marker>
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
