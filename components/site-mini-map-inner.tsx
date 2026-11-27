"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { pinIcon } from "@/components/pin-icon";

/** A small, still map: just the site's address pins, zoomed in. OpenStreetMap tiles, credited. */
export default function SiteMiniMapInner({ points }: { points: { lat: number; lng: number }[] }) {
  const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
  return (
    <MapContainer
      {...(points.length === 1 ? { center: [points[0].lat, points[0].lng] as [number, number], zoom: 17 } : { bounds, boundsOptions: { padding: [36, 36] as [number, number], maxZoom: 17 } })}
      className="h-44 w-full rounded-lg"
      dragging={false}
      touchZoom={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lng]} icon={pinIcon(true)} interactive={false} />
      ))}
    </MapContainer>
  );
}
