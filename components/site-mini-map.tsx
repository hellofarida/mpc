"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Inner = dynamic(() => import("@/components/site-mini-map-inner"), {
  ssr: false,
  loading: () => <div className="h-44 w-full animate-pulse rounded-lg bg-muted" />,
});

/** Mounts the map fresh each time the page is shown (Leaflet can't be reused after the page is hidden). */
export function SiteMiniMap({ name, points }: { name: string; points: { lat: number; lng: number }[] }) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLive(true), 0);
    return () => {
      clearTimeout(t);
      setLive(false);
    };
  }, []);
  return (
    <div role="img" aria-label={`Map showing where ${name} is`}>
      {live ? <Inner points={points} /> : <div className="h-44 w-full rounded-lg bg-muted" />}
    </div>
  );
}
