"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalkPlanner } from "@/components/walk-planner";
import { logEvent } from "@/lib/events";
import { SITES, distanceM, siteCentre } from "@/lib/sites";

const SiteMap = dynamic(() => import("@/components/site-map"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-xl bg-muted" />,
});

type Here = { lat: number; lng: number };

export function Home() {
  const [here, setHere] = useState<Here | null>(null);
  const [locState, setLocState] = useState<"idle" | "asking" | "denied">("idle");
  const [planning, setPlanning] = useState(false);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    logEvent("page_open");
  }, []);

  function locate() {
    if (!navigator.geolocation) return setLocState("denied");
    setLocState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocState("idle");
      },
      () => setLocState("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  const list = SITES.map((s) => ({ s, d: here ? distanceM(here, siteCentre(s)) : null })).sort((a, b) =>
    a.d !== null && b.d !== null ? a.d - b.d : a.s.number - b.s.number,
  );

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Melbourne Pollinator Corridor guide</h1>
      <SiteMap here={here} />

      <div className="space-y-2">
        <p className="text-sm">
          Your location stays on your phone. It&apos;s never sent or stored.
        </p>
        {here ? (
          <p className="text-sm text-muted-foreground">Showing the nearest gardens first.</p>
        ) : (
          <Button variant="outline" onClick={locate} disabled={locState === "asking"}>
            {locState === "asking" ? "Finding you…" : "Show where I am"}
          </Button>
        )}
        {locState === "denied" && (
          <p className="text-sm text-muted-foreground" role="status">
            We couldn&apos;t get your location. The map and list still work.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{here ? "Nearest gardens" : "Gardens"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {list.map(({ s, d }) => (
              <li key={s.id}>
                <Link href={`/sites/${s.id}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {s.number}. {s.name}
                    <span className="block text-xs text-muted-foreground">{s.suburb}</span>
                  </span>
                  {d !== null && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1000).toFixed(1)} km`}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {planning ? (
        <WalkPlanner here={here} />
      ) : (
        <Button onClick={() => setPlanning(true)}>Plan my walk</Button>
      )}
    </main>
  );
}
