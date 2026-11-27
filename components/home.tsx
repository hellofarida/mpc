"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonVariants, Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { logEvent } from "@/lib/events";
import { chosenPath, km, minutes, type RouteFile, type RouteMode } from "@/lib/route";
import { distanceM, siteCentre, sortWestToEast, type Site } from "@/lib/sites";
import { MAX_STOPS, MIN_STOPS, buildAppleWalkUrl, buildGoogleWalkUrl, googleDirectionsUrl } from "@/lib/walk";

const SiteMap = dynamic(() => import("@/components/site-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

type Here = { lat: number; lng: number };
type Mode = "search" | "plan";
type Layer = { key: number; id: string; open: boolean };
const SLIDE_MS = 200;

export function Home({ sites, route, details }: { sites: Site[]; route: RouteFile; details: Record<string, ReactNode> }) {
  const [here, setHere] = useState<Here | null>(null);
  const [locState, setLocState] = useState<"idle" | "asking" | "denied">("idle");
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  // Slide-out panels, oldest first. Opening another site slides the open panel back under the list as the new one slides out.
  const [layers, setLayers] = useState<Layer[]>([]);
  const top = layers[layers.length - 1];
  const selected = top?.open ? top.id : null;
  const [picked, setPicked] = useState<string[]>([]);
  const [routeMode, setRouteMode] = useState<RouteMode>("off");
  const autoRoute = useRef(false); // true while the route line is on only because 2+ sites are picked in plan mode
  const opened = useRef(false);
  const layerKey = useRef(0);
  const cleanup = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelEntry = useRef(false); // true while the open panel has its own history entry

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    logEvent("page_open");
  }, []);

  // "Plan walk" in the nav switches to plan mode (on arrival with #plan-walk, or from this page via an event).
  useEffect(() => {
    const plan = () => {
      changeMode("plan");
      closePanel();
    };
    const t = location.hash === "#plan-walk" ? setTimeout(plan, 0) : undefined;
    window.addEventListener("mpc:plan-walk", plan);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mpc:plan-walk", plan);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closePanel only uses refs and state setters
  }, []);

  // The panel gets a history entry when it opens, so the Back button closes it instead of leaving the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
    const onPop = () => {
      panelEntry.current = false;
      hideLayers();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closePanel only uses refs and state setters
  }, []);

  function closePanel() {
    if (panelEntry.current) history.back(); // popstate then closes it
    else hideLayers();
  }

  // Slide every panel back under the list, then drop them.
  function hideLayers() {
    if (cleanup.current) clearTimeout(cleanup.current);
    setLayers((ls) => ls.map((l) => ({ ...l, open: false })));
    cleanup.current = setTimeout(() => setLayers([]), SLIDE_MS + 50);
  }

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

  function open(id: string) {
    if (!panelEntry.current) {
      history.pushState(null, "", location.href);
      panelEntry.current = true;
    }
    if (selected === id) return;
    if (cleanup.current) clearTimeout(cleanup.current);
    const key = ++layerKey.current;
    // The open panel slides back under the list while the new one slides out, both at once.
    setLayers((ls) => [...ls.map((l) => ({ ...l, open: false })), { key, id, open: true }]);
    cleanup.current = setTimeout(() => setLayers((ls) => ls.filter((l) => l.open)), SLIDE_MS + 50);
  }

  // In plan mode, picking 2 or more sites switches the walking route line on by itself; it goes back off when the
  // picks drop below 2 or you leave plan mode (unless you chose a route setting yourself).
  function syncRoute(count: number, m: Mode) {
    if (m === "plan" && count >= MIN_STOPS && routeMode === "off") {
      setRouteMode("walking");
      autoRoute.current = true;
    } else if ((m !== "plan" || count < MIN_STOPS) && autoRoute.current) {
      setRouteMode("off");
      autoRoute.current = false;
    }
  }

  function changeMode(m: Mode) {
    setMode(m);
    syncRoute(picked.length, m);
  }

  function toggle(id: string) {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < MAX_STOPS ? [...picked, id] : picked;
    setPicked(next);
    syncRoute(next.length, mode);
  }

  function onSiteChosen(id: string) {
    if (mode === "plan") toggle(id);
    else open(id);
  }

  const q = query.trim().toLowerCase();
  const list = sites.map((s) => ({ s, d: here ? distanceM(here, siteCentre(s)) : null }))
    .filter(({ s }) => mode === "plan" || !q || `${s.name} ${s.suburb}`.toLowerCase().includes(q))
    .sort((a, b) => (a.d !== null && b.d !== null ? a.d - b.d : a.s.number - b.s.number));

  const mainSites = sites.filter((s) => s.kind !== "scattered");
  const stops = sortWestToEast(sites.filter((s) => picked.includes(s.id)));
  const ready = stops.length >= MIN_STOPS && stops.length <= MAX_STOPS;
  // Plan mode with 2+ sites picked: draw only the path through those sites, not the whole corridor.
  const chosen =
    mode === "plan" && stops.length >= MIN_STOPS && routeMode !== "off"
      ? chosenPath(route, stops.map((s) => s.id), routeMode)
      : null;
  const shownRoute = chosen ?? (routeMode === "off" ? null : route.variants[routeMode]);

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden md:flex-row">
      <aside className="order-2 flex min-h-0 flex-1 flex-col border-t bg-background md:relative md:z-[1410] md:order-1 md:w-96 md:flex-none md:border-r md:border-t-0">
        <div className="space-y-2 border-b p-3">
          <div role="group" aria-label="Mode" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
            {(["search", "plan"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => changeMode(m)}
                className={`rounded-md py-1.5 font-medium capitalize ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {m}
              </button>
            ))}
          </div>
          {mode === "search" ? (
            <Input
              type="search"
              placeholder="Search gardens"
              aria-label="Search gardens"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : (
            <p className="text-sm" role="status">
              {picked.length < MIN_STOPS
                ? `Pick ${MIN_STOPS} to ${MAX_STOPS} sites for your walk. ${picked.length} picked.`
                : `${picked.length} of ${MAX_STOPS} picked${picked.length === MAX_STOPS ? " (the most)" : ""}. Ready to open.`}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {here ? (
              <span>Nearest sites first. Your location stays on your phone.</span>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={locate} disabled={locState === "asking"}>
                  {locState === "asking" ? "Finding you…" : "Show where I am"}
                </Button>
                <span>{locState === "denied" ? "Couldn't get your location." : "Stays on your phone."}</span>
              </>
            )}
          </div>
        </div>

        <p className="px-3 pt-2 text-xs text-muted-foreground">
          {plural(mainSites.reduce((n, s) => n + s.gardens, 0), "garden")} across the {mainSites.length} main sites
        </p>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {list.length === 0 && <li className="text-sm text-muted-foreground">No sites match that search.</li>}
          {list.map(({ s, d }) => (
            <SiteCard
              key={s.id}
              site={s}
              distance={d}
              mode={mode}
              active={selected === s.id}
              checked={picked.includes(s.id)}
              disabled={mode === "plan" && !picked.includes(s.id) && picked.length >= MAX_STOPS}
              onChoose={() => onSiteChosen(s.id)}
            />
          ))}
        </ul>

        {mode === "plan" && ready && (
          <PlanBar stops={stops} here={here} />
        )}
      </aside>

      <div className="relative order-1 h-[38%] shrink-0 md:order-2 md:h-auto md:flex-1">
        <SiteMap
          sites={sites}
          route={route}
          routeMode={routeMode}
          chosen={chosen}
          here={here}
          picked={mode === "plan" ? picked : selected ? [selected] : []}
          panelOpen={!!selected}
          onSelect={onSiteChosen}
        />
        <div className="absolute right-2 top-2 z-[1000] w-44 space-y-1 rounded-lg border bg-background/95 p-1.5 text-xs shadow-sm">
          <div role="group" aria-label="Corridor route" className="flex items-center gap-1">
            {([["walking", "Walk"], ["cycling", "Cycle"], ["off", "Off"]] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={routeMode === m}
                onClick={() => {
                  autoRoute.current = false;
                  setRouteMode(m);
                }}
                className={`flex-1 rounded-md px-1 py-1 font-medium ${routeMode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {routeMode !== "off" && shownRoute && (
            <p className="hidden px-1 text-muted-foreground md:block">
              {chosen ? "Your walk" : "Corridor route, Westgate Park to the Botanic Gardens"}: {km(shownRoute.distanceM)},{" "}
              {minutes(shownRoute.durationS)} {routeMode === "walking" ? "on foot" : "by bike"}. Indicative.
            </p>
          )}
        </div>
      </div>

      {layers.map((l, i) => (
        <section
          key={l.key}
          aria-label="Site details"
          aria-hidden={!l.open || i !== layers.length - 1}
          inert={!l.open || i !== layers.length - 1}
          style={{ zIndex: 1400 + i }}
          className={`fixed bottom-0 left-0 right-0 top-14 flex flex-col bg-background shadow-xl transition-[translate,visibility] duration-200 md:left-96 md:right-auto md:w-[28rem] ${
            l.open
              ? "translate-x-0 animate-in duration-200 slide-in-from-right-full md:slide-in-from-left-full"
              : "invisible translate-x-full md:-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b p-2">
            <a
              href={`/sites/${l.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open in new tab
            </a>
            <Button variant="outline" size="sm" onClick={closePanel} aria-label="Close site details">
              Close
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{details[l.id]}</div>
        </section>
      ))}
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function SiteCard({
  site,
  distance,
  mode,
  active,
  checked,
  disabled,
  onChoose,
}: {
  site: Site;
  distance: number | null;
  mode: Mode;
  active: boolean;
  checked: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  const c = siteCentre(site);
  const dist = distance === null ? null : distance < 1000 ? `${Math.round(distance / 10) * 10} m` : `${(distance / 1000).toFixed(1)} km`;
  const body = (
    <>
      <span className="block font-medium">
        {site.number}. {site.name}
      </span>
      <span className="block text-xs text-muted-foreground">
        {site.suburb}
        {dist ? ` · ${dist}` : ""}
      </span>
      <span className="block text-xs text-muted-foreground">{site.gardensNote ?? plural(site.gardens, "garden")}</span>
    </>
  );
  return (
    <li className={`rounded-xl border p-3 text-sm ${active || (mode === "plan" && checked) ? "border-primary bg-muted" : ""} ${disabled ? "opacity-50" : ""}`}>
      {mode === "plan" ? (
        <label className="flex cursor-pointer items-center gap-3">
          <Checkbox checked={checked} disabled={disabled} onCheckedChange={onChoose} />
          <span>{body}</span>
        </label>
      ) : (
        <>
          <button type="button" onClick={onChoose} className="block w-full text-left">
            {body}
          </button>
          <a
            href={googleDirectionsUrl(c)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs underline"
            onClick={() => logEvent("directions_tap", { siteId: site.id, mapsApp: "google" })}
          >
            Open in maps
          </a>
        </>
      )}
    </li>
  );
}

function PlanBar({ stops, here }: { stops: Site[]; here: Here | null }) {
  const google = buildGoogleWalkUrl(stops, here);
  const apple = buildAppleWalkUrl(stops);
  const ids = stops.map((s) => s.id);
  if (!google || !apple) return null;
  return (
    <div className="space-y-2 border-t bg-background p-3 text-sm">
      <p>
        Order: {stops.map((s) => s.name).join(" → ")}
        {here ? " (from where you are)" : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={google}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "default" })}
          onClick={() => logEvent("walk_open", { stops: ids, mapsApp: "google" })}
        >
          Open in Google Maps
        </a>
        <a
          href={apple}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
          onClick={() => logEvent("walk_open", { stops: ids, mapsApp: "apple" })}
        >
          Apple Maps
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        Apple Maps can only route between two points, so it opens directions to the first stop ({stops[0].name}).
      </p>
    </div>
  );
}
