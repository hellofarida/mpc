import { SiteThumb } from "@/components/site-thumb";
import type { SiteImage } from "@/lib/site-images";

/**
 * The big picture at the top of a site's panel (the card's picture, enlarged). A MOCK photo of a native plant for now,
 * with its photographer's credit shown on the picture because the photos are CC BY-NC.
 */
export function SiteHero({ image }: { image?: SiteImage }) {
  if (!image) {
    return (
      <div className="flex h-56 items-center justify-center rounded-b-[12px] bg-muted">
        <SiteThumb className="size-24 bg-transparent" />
      </div>
    );
  }
  return (
    <div className="relative h-56 overflow-hidden rounded-b-[12px] bg-muted">
      {/* Linked from iNaturalist on purpose: photos are never copied (CC BY-NC). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url.replace("/small.", "/medium.")} alt={`${image.plant}, a native plant`} referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
      <p className="absolute bottom-2 left-2 max-w-[80%] truncate rounded bg-black/55 px-2 py-0.5 text-[11px] text-white">
        {image.plant} · Photo: {image.credit}
      </p>
    </div>
  );
}
