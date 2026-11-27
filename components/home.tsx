"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PlanModal, WalkButtons } from "@/components/plan-modal";
import { Button } from "@/components/ui/button";
import { SiteThumb } from "@/components/site-thumb";
import { Checkbox } from "@/components/ui/checkbox";
import { logEvent } from "@/lib/events";
import { chosenPath, km, minutes, type RouteFile, type RouteMode } from "@/lib/route";
import { sortWestToEast, type Site } from "@/lib/sites";
import { MAX_STOPS, MIN_STOPS } from "@/lib/walk";

const SiteMap = dynamic(() => import("@/components/site-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

type Mode = "search" | "plan";
type Layer = { key: number; id: string; open: boolean };
const SLIDE_MS = 200;

export function Home({ sites, route, details }: { sites: Site[]; route: RouteFile; details: Record<string, ReactNode> }) {
  const [mode, setMode] = useState<Mode>("search");
  const [planOpen, setPlanOpen] = useState(false); // the "View plan" modal
  // Slide-out panels, oldest first. Opening another site slides the open panel back under the list as the new one slides out.
  const [layers, setLayers] = useState<Layer[]>([]);
  const top = layers[layers.length - 1];
  const selected = top?.open ? top.id : null;
  const [picked, setPicked] = useState<string[]>([]);
  const [routeMode, setRouteMode] = useState<RouteMode>("off");
  const autoRoute = useRef(false); // true while the route line is on only because 2+ sites are picked in plan mode
  const opened = useRef(false);
  const layerKey = useRef(0);
  const panelOpenedAt = useRef<{ id: string; at: number } | null>(null); // for "opened and closed within 2 s"
  const recentOpens = useRef<{ id: string; at: number }[]>([]); // for "opened 3 different sites within 15 s"
  const walkOpened = useRef(false); // a walk was opened since the picks last reached 2
  const abandonLogged = useRef(false);
  const latest = useRef({ mode: "search" as Mode, picked: [] as string[] });
  const cleanup = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelEntry = useRef(false); // true while the open panel has its own history entry

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    logEvent("page_open");
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
    const o = panelOpenedAt.current;
    if (o && Date.now() - o.at < 2000) logEvent("panel_bounce", { siteId: o.id });
    panelOpenedAt.current = null;
    if (cleanup.current) clearTimeout(cleanup.current);
    setLayers((ls) => ls.map((l) => ({ ...l, open: false })));
    cleanup.current = setTimeout(() => setLayers([]), SLIDE_MS + 50);
  }

  function open(id: string) {
    if (!panelEntry.current) {
      history.pushState(null, "", location.href);
      panelEntry.current = true;
    }
    if (selected === id) return;
    const now = Date.now();
    panelOpenedAt.current = { id, at: now };
    recentOpens.current = [...recentOpens.current.filter((o) => now - o.at < 15000), { id, at: now }];
    const distinct = new Set(recentOpens.current.map((o) => o.id)).size;
    if (distinct >= 3) {
      logEvent("site_flip", { value: distinct });
      recentOpens.current = [];
    }
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

  // Picked 2+ stops in Plan but never opened the walk: log it once when they leave Plan or close the tab.
  function logAbandon(m: Mode, picks: string[]) {
    if (m === "plan" && picks.length >= MIN_STOPS && !walkOpened.current && !abandonLogged.current) {
      abandonLogged.current = true;
      logEvent("plan_abandon", { value: picks.length });
    }
  }

  function changeMode(m: Mode) {
    if (m !== "plan") logAbandon(mode, picked);
    setMode(m);
    syncRoute(picked.length, m);
  }

  function toggle(id: string) {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < MAX_STOPS ? [...picked, id] : picked;
    setPicked(next);
    syncRoute(next.length, mode);
    if (next.length < MIN_STOPS) {
      walkOpened.current = false;
      abandonLogged.current = false;
    }
  }

  // Select all picks every main site, up to the most a walk allows, west to east.
  function selectAll() {
    const ids = sortWestToEast(mainSites).slice(0, MAX_STOPS).map((x) => x.id);
    setPicked(ids);
    syncRoute(ids.length, mode);
  }

  function clearAll() {
    setPicked([]);
    syncRoute(0, mode);
    walkOpened.current = false;
    abandonLogged.current = false;
  }

  function onSiteChosen(id: string) {
    if (mode === "plan") toggle(id);
    else open(id);
  }

  useEffect(() => {
    latest.current = { mode, picked };
  });
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && logAbandon(latest.current.mode, latest.current.picked);
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const mainSites = sites.filter((s) => s.kind !== "scattered");
  const list = [...sites].sort((a, b) => a.number - b.number);

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
                data-track="mode-toggle"
                onClick={() => changeMode(m)}
                className={`rounded-md py-1.5 font-medium capitalize ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {m}
              </button>
            ))}
          </div>
          {mode === "plan" && (
            <p className="text-sm" role="status">
              {picked.length < MIN_STOPS
                ? `Pick ${MIN_STOPS} to ${MAX_STOPS} sites for your walk.`
                : `Ready: view your plan or open it in a maps app below.`}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 pt-2 text-xs text-muted-foreground">
          <span>
            {plural(mainSites.reduce((n, s) => n + s.gardens, 0), "garden")} across the {mainSites.length} main sites
          </span>
          {mode === "plan" && (
            <span className="flex items-center gap-3 whitespace-nowrap">
              <span>
                {picked.length} selected{mainSites.length > MAX_STOPS ? ` (max ${MAX_STOPS})` : ""}
              </span>
              <button type="button" data-track="select-all" className="underline" onClick={selectAll}>
                Select all
              </button>
              <button type="button" data-track="clear-all" className="underline" onClick={clearAll}>
                Clear
              </button>
            </span>
          )}
        </div>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {list.map((s) => (
            <SiteCard
              key={s.id}
              site={s}
              mode={mode}
              active={selected === s.id}
              checked={picked.includes(s.id)}
              disabled={mode === "plan" && !picked.includes(s.id) && picked.length >= MAX_STOPS}
              onChoose={() => onSiteChosen(s.id)}
            />
          ))}
        </ul>

        {mode === "plan" && ready && (
          <PlanBar stops={stops} onView={() => setPlanOpen(true)} onOpened={() => (walkOpened.current = true)} />
        )}
      </aside>

      <div className="relative order-1 h-[38%] shrink-0 md:order-2 md:h-auto md:flex-1">
        <SiteMap
          sites={sites}
          route={route}
          routeMode={routeMode}
          chosen={chosen}
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
                data-track="route-toggle"
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
          <div className="flex items-center border-b p-2">
            <button
              type="button"
              data-track="panel-close"
              onClick={closePanel}
              aria-label="Back to the list of sites"
              className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 10H4M9 5l-5 5 5 5" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{details[l.id]}</div>
        </section>
      ))}
      {planOpen && ready && <PlanModal stops={stops} route={route} onClose={() => setPlanOpen(false)} onOpened={() => (walkOpened.current = true)} />}
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function SiteCard({
  site,
  mode,
  active,
  checked,
  disabled,
  onChoose,
}: {
  site: Site;
  mode: Mode;
  active: boolean;
  checked: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  const body = (
    <>
      <SiteThumb />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{site.name}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{site.suburb}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{site.gardensNote ?? plural(site.gardens, "garden")}</span>
      </span>
    </>
  );
  const card = `flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm ${
    active || (mode === "plan" && checked) ? "border-primary bg-muted" : "hover:bg-muted/50"
  }`;
  return (
    <li className={disabled ? "opacity-50" : ""}>
      {mode === "plan" ? (
        <label data-track="plan-pick" className={`${card} cursor-pointer`}>
          {body}
          <Checkbox checked={checked} disabled={disabled} onCheckedChange={onChoose} />
        </label>
      ) : (
        <button type="button" data-track="site-card" onClick={onChoose} className={card}>
          {body}
        </button>
      )}
    </li>
  );
}

function PlanBar({ stops, onView, onOpened }: { stops: Site[]; onView: () => void; onOpened: () => void }) {
  return (
    <div className="space-y-2 border-t bg-background p-3 text-sm">
      <p>Order: {stops.map((s) => s.name).join(" → ")}</p>
      <Button variant="outline" onClick={onView} data-track="view-plan">
        View plan
      </Button>
      <WalkButtons stops={stops} onOpened={onOpened} />
    </div>
  );
}
