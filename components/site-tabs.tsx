"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type SiteTab = { id: string; label: string; content: React.ReactNode; fillToTallest?: boolean };

/**
 * About / Stats / Sightings / Chat. All four stay mounted (so a half-typed chat question or the map isn't lost when you
 * switch), only the active one is shown. Left and right arrow keys move between tabs.
 * A tab marked fillToTallest (Chat) is given at least the height of the tallest tab, so the scroll position you had
 * isn't cut short when you switch to it.
 */
export function SiteTabs({ tabs }: { tabs: SiteTab[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panels = useRef<Record<string, HTMLDivElement | null>>({});
  const fill = useRef(tabs.filter((t) => t.fillToTallest).map((t) => t.id));

  /** Measures every panel (briefly showing the hidden ones within one frame, so nothing is painted or loaded). */
  function equalise() {
    let tallest = 0;
    for (const el of Object.values(panels.current)) {
      if (!el) continue;
      const wasHidden = el.hidden;
      if (wasHidden) el.hidden = false;
      const own = el.style.minHeight;
      el.style.minHeight = "";
      tallest = Math.max(tallest, el.offsetHeight);
      el.style.minHeight = own;
      if (wasHidden) el.hidden = true;
    }
    for (const id of fill.current) {
      const el = panels.current[id];
      if (el) el.style.minHeight = `${tallest}px`;
    }
  }

  useLayoutEffect(equalise, [active]);
  useEffect(() => {
    window.addEventListener("resize", equalise);
    return () => window.removeEventListener("resize", equalise);
  }, []);

  function onKey(e: React.KeyboardEvent, i: number) {
    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : null;
    if (next === null) return;
    e.preventDefault();
    setActive(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="About this site" className="sticky top-0 z-10 mt-5 flex border-b bg-background">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            data-track="site-tab"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={`flex-1 border-b-2 px-2 py-4 text-sm font-medium ${
              active === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          ref={(el) => {
            panels.current[t.id] = el;
          }}
          id={`panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          hidden={active !== t.id}
          className="space-y-8 p-5"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
