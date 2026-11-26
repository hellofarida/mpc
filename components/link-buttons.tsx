"use client";

import { LeaveLink } from "@/components/leave-link";
import { logEvent } from "@/lib/events";
import { HEARTSCAPES_JOIN_URL, HEARTSCAPES_VOLUNTEER_URL, INAT_UPLOAD_URL } from "@/lib/links";

export function LogSightingButton({ siteId }: { siteId?: string }) {
  return (
    <LeaveLink
      href={INAT_UPLOAD_URL}
      destination="iNaturalist"
      variant="default"
      onContinue={() => logEvent("log_tap", { siteId })}
    >
      Log a sighting on iNaturalist
    </LeaveLink>
  );
}

export function JoinButtons({ siteId }: { siteId?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <LeaveLink
        href={HEARTSCAPES_JOIN_URL}
        destination="Heartscapes (membership)"
        onContinue={() => logEvent("join_tap", { siteId })}
      >
        Join Heartscapes
      </LeaveLink>
      <LeaveLink
        href={HEARTSCAPES_VOLUNTEER_URL}
        destination="Heartscapes (volunteering)"
        onContinue={() => logEvent("join_tap", { siteId })}
      >
        Volunteer
      </LeaveLink>
    </div>
  );
}
