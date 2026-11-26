import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 space-y-1 border-t px-4 py-4 text-xs text-muted-foreground">
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
    </footer>
  );
}
