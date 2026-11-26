import Link from "next/link";
import { Suspense } from "react";
import { GardenDetail } from "@/components/garden-detail";
import { getSites } from "@/lib/content";

export async function generateStaticParams() {
  return (await getSites()).map((s) => ({ id: s.id }));
}

export default function GardenPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-4 text-sm">Loading…</p>}>
      <Garden params={params} />
    </Suspense>
  );
}

async function Garden({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto w-full max-w-xl space-y-4 p-4">
      <Link href="/" className="text-sm underline">
        ← Map
      </Link>
      <GardenDetail id={id} />
    </main>
  );
}
