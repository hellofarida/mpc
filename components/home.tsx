"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PlanView } from "@/components/plan-modal";
import { Button } from "@/components/ui/button";
import { SiteThumb } from "@/components/site-thumb";
import { logEvent } from "@/lib/events";
import { chosenPath, km, minutes, type RouteFile, type RouteMode } from "@/lib/route";
import type { SiteImage } from "@/lib/site-images";
import { GENERAL_NOTE, sortWestToEast, type Site } from "@/lib/sites";
import { MAX_STOPS, MIN_STOPS } from "@/lib/walk";

const SiteMap = dynamic(() => import("@/components/site-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

type Mode = "search" | "plan";
type Layer = { key: number; id: string; open: boolean };
const SLIDE_MS = 200;

export function Home({ sites, route, images, details }: { sites: Site[]; route: RouteFile; images: Record<string, SiteImage>; details: Record<string, ReactNode> }) {
  const [mode, setMode] = useState<Mode>("search");
  // Slide-out panels, oldest first. Opening another site slides the open panel back under the list as the new one slides out.
  const [layers, setLayers] = useState<Layer[]>([]);
  const top = layers[layers.length - 1];
  const selected = top?.open ? top.id : null;
  const [picked, setPicked] = useState<string[]>([]);
  const [backAnim, setBackAnim] = useState(false); // true right after "back" from the plan: fade the list back in from the left
  const [planView, setPlanView] = useState(false); // Plan tab, step 2: the plan replaces the list of sites
  const [routeMode, setRouteMode] = useState<RouteMode>("off");
  const autoRoute = useRef(false); // true while the route line is on only because 2+ sites are picked in plan mode
  const layerKey = useRef(0);
  const panelOpenedAt = useRef<{ id: string; at: number } | null>(null); // for "opened and closed within 2 s"
  const recentOpens = useRef<{ id: string; at: number }[]>([]); // for "opened 3 different sites within 15 s"
  const walkOpened = useRef(false); // a walk was opened since the picks last reached 2
  const abandonLogged = useRef(false);
  const latest = useRef({ mode: "search" as Mode, picked: [] as string[] });
  const cleanup = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelEntry = useRef(false); // true while the open panel has its own history entry

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
    setBackAnim(false);
    if (m !== "plan") {
      logAbandon(mode, picked);
      setPlanView(false);
    }
    setMode(m);
    syncRoute(picked.length, m);
  }

  function toggle(id: string) {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < MAX_STOPS ? [...picked, id] : picked;
    setPicked(next);
    syncRoute(next.length, mode);
    if (next.length < MIN_STOPS) setPlanView(false);
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
    setPlanView(false);
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

  const showPlan = mode === "plan" && planView && ready;

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden md:h-dvh">
      <aside className="order-2 flex min-h-0 flex-1 flex-col border-t bg-background md:absolute md:bottom-3 md:left-3 md:top-3 md:z-[1410] md:w-100 md:flex-none md:overflow-hidden md:rounded-2xl md:border-0 md:shadow-xl">
        <div className={`p-4 ${mode === "search" ? "border-b" : "pb-3"}`}>
          <div role="group" aria-label="Mode" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
            {(["search", "plan"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                data-track="mode-toggle"
                onClick={() => changeMode(m)}
                className={`rounded-md py-2 font-medium capitalize ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* One block: the heading, divider and everything under it swap and animate together, sideways only. */}
        <div
          key={showPlan ? "plan" : "pick"}
          className={`flex min-h-0 flex-1 flex-col ${
            showPlan
              ? "animate-in duration-300 fade-in slide-in-from-right-4 motion-reduce:animate-none"
              : backAnim
                ? "animate-in duration-300 fade-in slide-in-from-left-4 motion-reduce:animate-none"
                : ""
          }`}
        >
          {mode === "plan" && (
            <div className="border-b px-4 pb-4">
              {showPlan ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-track="plan-back"
                    onClick={() => {
                      setBackAnim(true);
                      setPlanView(false);
                    }}
                    aria-label="Back to picking sites"
                    className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 10H4M9 5l-5 5 5 5" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold">Your plan</h2>
                    <p className="text-sm">{stops.length} stops, west to east</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-semibold">Plan your journey</h2>
                  <p className="text-sm">
                    Pick {MIN_STOPS} to {MAX_STOPS} sites for your walk.
                  </p>
                </div>
              )}
            </div>
          )}

          {showPlan ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <PlanView stops={stops} route={route} images={images} onOpened={() => (walkOpened.current = true)} onViewSite={(id) => open(id)} />
            </div>
          ) : (
            <>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pb-4 pt-4 text-xs text-muted-foreground">
          <span>
            {plural(mainSites.reduce((n, s) => n + s.gardens, 0), "garden")} across the {mainSites.length} main sites
          </span>
          {mode === "plan" && (
            <span className="flex items-center gap-3 whitespace-nowrap">
              <button type="button" data-track="select-all" className="underline" onClick={selectAll}>
                Select all
              </button>
              <button type="button" data-track="clear-all" className="underline" onClick={clearAll}>
                Clear
              </button>
            </span>
          )}
        </div>
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {list.map((s) => (
            <SiteCard
              key={s.id}
              site={s}
              image={images[s.id]}
              mode={mode}
              active={selected === s.id}
              checked={picked.includes(s.id)}
              disabled={mode === "plan" && !picked.includes(s.id) && picked.length >= MAX_STOPS}
              onChoose={() => onSiteChosen(s.id)}
            />
          ))}
          {sites.some((s) => s.note === GENERAL_NOTE) && (
            <li role="note" className="rounded-xl bg-muted p-4 text-xs text-muted-foreground">
              {GENERAL_NOTE}
            </li>
          )}
        </ul>

        {mode === "plan" && (
          <div className="flex items-center justify-between gap-3 border-t bg-background p-4 text-sm">
            <span role="status">{picked.length} selected</span>
            <Button data-track="view-plan" disabled={!ready} onClick={() => {
                setBackAnim(false);
                setPlanView(true);
              }}>
              View plan
            </Button>
          </div>
        )}
            </>
          )}
        </div>
      </aside>

      <div className="relative order-1 h-[38%] shrink-0 md:absolute md:inset-0 md:order-2 md:h-auto">
        <SiteMap
          sites={sites}
          route={route}
          routeMode={routeMode}
          chosen={chosen}
          picked={mode === "plan" ? picked : selected ? [selected] : []}
          panelOpen={!!selected}
          onSelect={onSiteChosen}
        />
        <div className="absolute right-2 top-2 z-[1000] w-44 space-y-1 rounded-lg border bg-background/95 p-1.5 text-xs shadow-sm md:right-3 md:top-20 md:rounded-2xl md:border-0 md:shadow-lg">
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
          style={{ zIndex: 1400 + i, transitionDuration: "200ms, 150ms, 200ms" }}
          className={`fixed bottom-0 left-0 right-0 top-14 flex flex-col bg-background shadow-xl transition-[translate,opacity,visibility] md:bottom-3 md:left-[26.5rem] md:right-auto md:top-20 md:w-[28rem] md:overflow-hidden md:rounded-2xl ${
            l.open
              ? "translate-x-0 animate-in duration-200 fade-in slide-in-from-right-full md:slide-in-from-left-full"
              : "invisible translate-x-full opacity-0 md:-translate-x-full"
          }`}
        >
          <button
            type="button"
            data-track="panel-close"
            onClick={closePanel}
            aria-label="Close site details"
            className="absolute right-3 top-3 z-20 flex size-10 items-center justify-center rounded-full bg-white text-black shadow-md hover:bg-neutral-100"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto">{details[l.id]}</div>
        </section>
      ))}
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function SiteCard({
  site,
  image,
  mode,
  active,
  checked,
  disabled,
  onChoose,
}: {
  site: Site;
  image?: SiteImage;
  mode: Mode;
  active: boolean;
  checked: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col p-4">
        <span className="block text-[1.1rem] font-medium leading-snug">{site.name}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{site.suburb}</span>
        <span className="mt-auto block pt-3 text-xs text-muted-foreground">{site.gardensNote ?? plural(site.gardens, "garden")}</span>
      </span>
      <SiteThumb image={image} className="size-auto min-h-28 w-36 self-stretch rounded-[calc(var(--radius-xl)-1px)]" />
    </>
  );
  const card = `group relative flex w-full items-stretch overflow-hidden rounded-xl border text-left text-sm ${
    active || (mode === "plan" && checked) ? "border-primary bg-muted" : "hover:bg-muted/50"
  }`;
  return (
    <li className={disabled ? "opacity-50" : ""}>
      {mode === "plan" ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          disabled={disabled}
          data-track="plan-pick"
          onClick={onChoose}
          className={`${card} cursor-pointer`}
        >
          {body}
          <span
            aria-hidden="true"
            className={`absolute bottom-3 right-3 flex size-7 items-center justify-center rounded-full border-2 shadow-md transition-colors ${
              checked ? "border-primary bg-primary text-primary-foreground" : "border-white bg-black/30 text-transparent"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        </button>
      ) : (
        <button type="button" data-track="site-card" onClick={onChoose} className={card}>
          {body}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute bottom-3 right-3 text-white opacity-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}
    </li>
  );
}
