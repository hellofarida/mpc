import type { Metadata } from "next";
import Link from "next/link";
import { getSites } from "@/lib/content";

export const metadata: Metadata = { title: "About – MPC guide" };

export default async function AboutPage() {
  const sites = await getSites();
  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-5 py-8 text-sm leading-relaxed">
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
        {sites.map((s) => (
          <li key={s.id}>
            <Link className="underline" href={`/sites/${s.id}`}>
              {s.name}
            </Link>
            , {s.suburb}
          </li>
        ))}
      </ul>
      <div className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
        <p>Prototype by a Le Wagon student, not an official Heartscapes service.</p>
        <p>
          Map data ©{" "}
          <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            OpenStreetMap contributors
          </a>
          . Sightings from the{" "}
          <a
            className="underline"
            href="https://www.inaturalist.org/projects/melbourne-pollinator-corridor"
            target="_blank"
            rel="noopener noreferrer"
          >
            MPC project on iNaturalist
          </a>
          , shared under CC BY-NC by their observers.
        </p>
        <p>
          <Link className="underline" href="/privacy">
            Privacy
          </Link>
        </p>
      </div>
    </main>
  );
}
