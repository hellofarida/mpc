"use client";

import { useRef, useState } from "react";

export type SiteTab = { id: string; label: string; content: React.ReactNode };

/**
 * About / Stats / Sightings / Chat. All four stay mounted (so a half-typed chat question or the map isn't lost when you
 * switch), only the active one is shown. Left and right arrow keys move between tabs.
 */
export function SiteTabs({ tabs }: { tabs: SiteTab[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKey(e: React.KeyboardEvent, i: number) {
    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : null;
    if (next === null) return;
    e.preventDefault();
    setActive(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="About this site" className="sticky top-0 z-10 flex border-b bg-background">
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
            className={`flex-1 border-b-2 px-2 py-3 text-sm font-medium ${
              active === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`panel-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} className="space-y-4 p-4">
          {t.content}
        </div>
      ))}
    </div>
  );
}
