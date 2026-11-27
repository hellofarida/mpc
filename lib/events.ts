"use client";

import { supabase } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/device";
import { getSessionId } from "@/lib/session";

export type EventName =
  | "page_open"
  | "garden_view"
  | "question"
  | "log_tap"
  | "join_tap"
  | "directions_tap"
  | "walk_open";

export type EventExtras = {
  siteId?: string;
  mapsApp?: "google" | "apple";
  stops?: string[]; // walk_open only: 2–5 site IDs
  placement?: string; // where a tap happened, e.g. "garden-join" (lowercase letters, digits, dashes)
};

/**
 * Record one golden-path step. Fire-and-forget: it never throws and never blocks the visitor.
 * Stores only the event, the garden, the time and the anonymous device ID.
 */
export function logEvent(event: EventName, extras: EventExtras = {}): void {
  void supabase()
    .from("events")
    .insert({
      event,
      site_id: extras.siteId ?? null,
      maps_app: extras.mapsApp ?? null,
      stops: extras.stops ?? null,
      placement: extras.placement ?? null,
      device_id: getDeviceId(),
      session_id: getSessionId(),
    })
    .then(({ error }) => {
      if (error && process.env.NODE_ENV !== "production") console.warn("logEvent failed", event, error.message);
    });
}

export type TravelMode = "walked" | "cycled" | "ran" | "other";

/** One-tap check-in. Returns "saved", "repeat" (ignored: same garden within an hour) or "error". */
export async function checkIn(siteId: string, mode: TravelMode): Promise<"saved" | "repeat" | "error"> {
  const { data, error } = await supabase().rpc("check_in", {
    p_site_id: siteId,
    p_mode: mode,
    p_device_id: getDeviceId(),
  });
  if (error) return "error";
  return data === true ? "saved" : "repeat";
}

/**
 * Optional extras after a check-in: favourite garden and a one-line comment. Returns "saved", "none" (nothing to
 * update: no recent check-in or already filled) or "error" (for example a comment the database refuses).
 */
export async function checkinDetails(
  siteId: string,
  favouriteSiteId: string | null,
  comment: string | null,
): Promise<"saved" | "none" | "error"> {
  const { data, error } = await supabase().rpc("checkin_details", {
    p_site_id: siteId,
    p_device_id: getDeviceId(),
    p_favourite_site_id: favouriteSiteId,
    p_comment: comment,
  });
  if (error) return "error";
  return data === true ? "saved" : "none";
}
