import { cn } from "@/lib/utils";

/**
 * The picture of a site. A placeholder for now (a simple flower); when sites get photos, show the photo here.
 */
export function SiteThumb({ className }: { className?: string }) {
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
