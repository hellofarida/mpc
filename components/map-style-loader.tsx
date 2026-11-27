"use client";

import dynamic from "next/dynamic";

const Preview = dynamic(() => import("@/components/map-style-preview").then((m) => m.MapStylePreview), {
  ssr: false,
  loading: () => <p className="text-sm">Loading maps…</p>,
});

export function MapStyleLoader() {
  return <Preview />;
}
