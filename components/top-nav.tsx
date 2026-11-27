"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/modal";

type Panel = "about" | "involved";
const LINKS: { id: Panel; label: string }[] = [
  { id: "about", label: "About" },
  { id: "involved", label: "Get involved" },
];

/** About and Get involved open as pop-ups over the page (their own pages still work as direct links). */
export function TopNav({ about, involved }: { about: React.ReactNode; involved: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  // Remember which page the pop-up was opened on: following a link inside it moves to another page, which closes it.
  const [opened, setOpened] = useState<{ id: Panel; at: string } | null>(null);
  const panel = opened && opened.at === path ? opened.id : null;
  const setPanel = (id: Panel | null) => setOpened(id ? { id, at: path } : null);
  const show = (p: Panel) => {
    setOpen(false);
    setPanel(p);
  };
  const home = path === "/"; // on the map page (desktop) the nav floats over the map, right of the list panel

  return (
    <header
      className={`sticky top-0 z-[1500] h-14 border-b bg-background ${
        home ? "md:fixed md:left-[26.5rem] md:right-3 md:top-3 md:rounded-2xl md:border-0 md:shadow-xl" : ""
      }`}
    >
      <nav aria-label="Main" className="flex h-full w-full items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="whitespace-nowrap font-heading text-base font-bold tracking-[-0.01em]">Melbourne Pollinator Corridor</span>
        </Link>
        <ul className="hidden items-center gap-6 text-sm md:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <button type="button" className="hover:underline" onClick={() => show(l.id)}>
                {l.label}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="main-menu"
          onClick={() => setOpen((o) => !o)}
          className="flex size-10 items-center justify-center rounded-md border md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
          </svg>
        </button>
      </nav>
      {open && (
        <ul id="main-menu" className="absolute inset-x-0 top-full divide-y border-b bg-background px-4 text-sm shadow-md md:hidden">
          {LINKS.map((l) => (
            <li key={l.id}>
              <button type="button" className="block w-full py-3 text-left" onClick={() => show(l.id)}>
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {panel && (
        <Modal label={panel === "about" ? "About" : "Get involved"} onClose={() => setPanel(null)}>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setPanel(null)}
            className="float-right -mr-1 -mt-1 flex size-8 items-center justify-center rounded-full hover:bg-muted"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </button>
          {panel === "about" ? about : involved}
        </Modal>
      )}
    </header>
  );
}
