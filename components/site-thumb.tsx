import type { SiteImage } from "@/lib/site-images";
import { cn } from "@/lib/utils";

/**
 * The picture of a site. For now a MOCK photo of a flowering native plant seen nearby (linked from iNaturalist, credit
 * in the tooltip and alt text); a simple flower if there is none. Replace with Heartscapes' own photo of the garden.
 */
export function SiteThumb({ image, className }: { image?: SiteImage; className?: string }) {
  if (image) {
    return (
      <span className={cn("relative block size-16 shrink-0 overflow-hidden rounded-lg bg-muted", className)}>
        {/* Linked from iNaturalist on purpose: photos are never copied (CC BY-NC). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={`${image.plant}, a native plant. Photo: ${image.credit}`}
          title={`${image.plant}. Photo: ${image.credit}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full object-cover"
        />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={cn("flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted", className)}>
      <svg width="30" height="30" viewBox="0 0 30 30">
        <g fill="#EF9F27">
          <circle cx="15" cy="7" r="5" />
          <circle cx="15" cy="23" r="5" />
          <circle cx="7" cy="15" r="5" />
          <circle cx="23" cy="15" r="5" />
        </g>
        <circle cx="15" cy="15" r="4.5" fill="#854F0B" />
      </svg>
    </span>
  );
}
