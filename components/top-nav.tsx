"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/get-involved", label: "Get involved" },
];

export function TopNav() {
  const [open, setOpen] = useState(false);
  const home = usePathname() === "/"; // on the map page (desktop) the nav floats over the map, right of the list panel

  return (
    <header
      className={`sticky top-0 z-[1500] h-14 border-b bg-background ${
        home ? "md:fixed md:left-[26.5rem] md:right-3 md:top-3 md:rounded-2xl md:border-0 md:shadow-xl" : ""
      }`}
    >
      <nav aria-label="Main" className="flex h-full w-full items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="whitespace-nowrap text-sm font-semibold">Melbourne Pollinator Corridor</span>
        </Link>
        <ul className="hidden items-center gap-6 text-sm md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:underline" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
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
            <li key={l.href}>
              <Link href={l.href} className="block py-3" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
