import type { Metadata } from "next";
import Link from "next/link";
import { SITES } from "@/lib/sites";

export const metadata: Metadata = { title: "About – MPC guide" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">About</h1>
      <p>
        The Melbourne Pollinator Corridor is a string of pollinator gardens in inner Melbourne, created by
        Heartscapes. This guide shows the 8 main sites, what has been seen at each, and lets you plan a walk
        between them.
      </p>
      <p>
        Sightings come from the{" "}
        <a
          className="underline"
          href="https://www.inaturalist.org/projects/melbourne-pollinator-corridor"
          target="_blank"
          rel="noopener noreferrer"
        >
          MPC project on iNaturalist
        </a>
        . Summaries and answers are written by AI from that data, and checked by code.
      </p>
      <p>
        Near South Melbourne you&apos;ll also see residents&apos; own street gardens. They&apos;re lovely, but they
        aren&apos;t part of the corridor. Look for the MPC signs.
      </p>
      <h2 className="text-base font-semibold">The 8 main sites</h2>
      <ul className="list-disc space-y-1 pl-5">
        {SITES.map((s) => (
          <li key={s.id}>
            <Link className="underline" href={`/sites/${s.id}`}>
              {s.name}
            </Link>
            , {s.suburb}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">
        This is a prototype by a Le Wagon student, not an official Heartscapes service.{" "}
        <Link className="underline" href="/privacy">
          Privacy
        </Link>
      </p>
    </main>
  );
}
