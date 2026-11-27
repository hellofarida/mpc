"use client";

import { useState } from "react";
import { LeaveLink } from "@/components/leave-link";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";

export type GridSighting = {
  id: number;
  url: string; // the original iNaturalist observation
  photoUrl: string;
  name: string;
  date: string;
  observer: string;
  attribution: string;
};

/**
 * Recent sightings as pictures, three across. The credit (observer, licence) and the link to the original are one tap
 * away, because the photos are CC BY or CC BY-NC and must be credited. Photos are hot-linked from iNaturalist,
 * never copied.
 */
export function SightingGrid({ items }: { items: GridSighting[] }) {
  const [open, setOpen] = useState<GridSighting | null>(null);
  if (items.length === 0) return <p className="text-sm">No sightings with photos yet. Be the first!</p>;
  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5">
        {items.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              data-track="sighting-photo"
              onClick={() => setOpen(s)}
              aria-label={`${s.name}, ${s.date}. Show credit`}
              className="block w-full overflow-hidden rounded-md"
            >
              {/* Hot-linked from iNaturalist on purpose: photos are never copied (CC BY-NC). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.photoUrl} alt={s.name} loading="lazy" referrerPolicy="no-referrer" className="aspect-square w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Photos belong to the people who took them. Tap a photo for the credit.</p>

      {open && (
        <Modal label={`${open.name}, photo credit`} onClose={() => setOpen(null)}>
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.photoUrl} alt={open.name} referrerPolicy="no-referrer" className="max-h-[50dvh] w-full rounded-lg object-contain" />
            <div className="space-y-0.5 text-sm">
              <p className="font-medium">{open.name}</p>
              <p className="text-muted-foreground">
                {open.date} · observed by {open.observer}
              </p>
              <p className="text-xs text-muted-foreground">Photo: {open.attribution}</p>
            </div>
            <div className="flex items-center gap-2">
              <LeaveLink href={open.url} destination="iNaturalist (original observation)" variant="outline">
                See the original
              </LeaveLink>
              <Button variant="outline" onClick={() => setOpen(null)} autoFocus>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
