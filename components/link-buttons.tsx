"use client";

import { LeaveLink } from "@/components/leave-link";
import { logEvent } from "@/lib/events";
import { heartscapesJoinUrl, heartscapesVolunteerUrl, INAT_UPLOAD_URL } from "@/lib/links";

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
  const where = siteId ? "garden" : "page"; // on a garden's page, or on the Get involved page
  return (
    <div className="flex flex-wrap gap-2">
      <LeaveLink
        href={heartscapesJoinUrl(`${where}-join`, siteId)}
        destination="Heartscapes (membership)"
        onContinue={() => logEvent("join_tap", { siteId, placement: `${where}-join` })}
      >
        Join Heartscapes
      </LeaveLink>
      <LeaveLink
        href={heartscapesVolunteerUrl(`${where}-volunteer`, siteId)}
        destination="Heartscapes (volunteering)"
        onContinue={() => logEvent("join_tap", { siteId, placement: `${where}-volunteer` })}
      >
        Volunteer
      </LeaveLink>
    </div>
  );
}
