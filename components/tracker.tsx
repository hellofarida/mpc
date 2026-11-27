"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { logEvent } from "@/lib/events";
import { startPresence } from "@/lib/presence";

/**
 * Notices a few signs of frustration and logs them anonymously: repeated quick taps in one spot, and app errors.
 * It records only a fixed label for the element (from data-track, never the words on screen), never where on the
 * screen, never anything typed. Also notes the device class once per visit (and page load time for 1 visit in 10).
 */
function labelFor(el: Element | null): string {
  const tagged = el?.closest("[data-track]")?.getAttribute("data-track");
  if (tagged && /^[a-z0-9-]{1,40}$/.test(tagged)) return tagged;
  if (el?.closest(".leaflet-marker-icon")) return "map-pin";
  if (el?.closest(".leaflet-control-zoom")) return "map-zoom";
  if (el?.closest(".leaflet-container")) return "map";
  if (el?.closest("button")) return "button";
  if (el?.closest("a")) return "link";
  return "page";
}

/** Which page this is, as a fixed label. Garden pages are counted by garden_view instead. */
function pageSlug(pathname: string): string | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/sites/")) return null;
  const slug = pathname.slice(1).replace(/[^a-z0-9-]/g, "");
  return ["about", "get-involved", "privacy", "plan"].includes(slug) ? slug : "other";
}

/** Approximate area of this visit (see app/api/geo/route.ts). Gives up quietly after 2 seconds. */
async function fetchGeo(): Promise<{ country?: string; region?: string; city?: string }> {
  try {
    const res = await fetch("/api/geo", { cache: "no-store", signal: AbortSignal.timeout(2000) });
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
}

export function Tracker() {
  const pathname = usePathname();
  // counted as "online now" while this page is open and visible (a live connection, nothing saved)
  useEffect(() => startPresence(), []);

  // one page view each time the page changes (the garden panel logs garden_view itself)
  useEffect(() => {
    const slug = pageSlug(pathname);
    if (slug) logEvent("page_open", { detail: slug });
  }, [pathname]);

  useEffect(() => {
    // device class, once per visit
    try {
      if (!sessionStorage.getItem("mpc-visit-info")) {
        sessionStorage.setItem("mpc-visit-info", "1");
        const w = window.innerWidth;
        const detail = w < 640 ? "phone" : w < 1024 ? "tablet" : "desktop";
        const sampled = Math.random() < 0.1;
        const send = async () => {
          const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
          const ms = sampled && nav && nav.domContentLoadedEventEnd > 0 ? nav.domContentLoadedEventEnd : undefined;
          logEvent("visit_info", { detail, value: ms, ...(await fetchGeo()) });
        };
        if (document.readyState === "complete") void send();
        else window.addEventListener("load", () => void send(), { once: true });
      }
    } catch { /* storage blocked: skip */ }

    // rage clicks: 3 or more taps within one second, within 40 px of the first
    let taps: { t: number; x: number; y: number }[] = [];
    const quiet = new Map<string, number>();
    const onClick = (e: MouseEvent) => {
      const now = Date.now();
      taps = [...taps.filter((t) => now - t.t < 1000), { t: now, x: e.clientX, y: e.clientY }];
      const first = taps[0];
      if (taps.length >= 3 && taps.every((t) => Math.hypot(t.x - first.x, t.y - first.y) < 40)) {
        const label = labelFor(e.target instanceof Element ? e.target : null);
        taps = [];
        if (label === "map-zoom") return; // pressing + or - several times is normal
        if (now - (quiet.get(label) ?? 0) < 5000) return;
        quiet.set(label, now);
        logEvent("rage_click", { detail: label });
      }
    };

    // errors: only that one happened, never the message
    let errors = 0;
    const onError = () => errors++ < 3 && logEvent("error", { detail: "js-error" });
    const onRejection = () => errors++ < 3 && logEvent("error", { detail: "js-promise" });

    document.addEventListener("click", onClick, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
