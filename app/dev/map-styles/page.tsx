import { notFound } from "next/navigation";
import { MapStyleLoader } from "@/components/map-style-loader";

/** Development only (a 404 in production): compare CARTO's map styles with our pins. */
export default function MapStylesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-5 py-8">
      <h1 className="text-2xl font-semibold">Map styles</h1>
      <p className="text-sm text-muted-foreground">
        Each map shows the corridor with the 8 site pins. To use one, set the value shown under it as{" "}
        <code>NEXT_PUBLIC_CARTO_STYLE</code> in <code>.env.local</code> (and in Vercel), then restart. The guide uses Voyager unless
        you set another.
      </p>
      <MapStyleLoader />
    </main>
  );
}
