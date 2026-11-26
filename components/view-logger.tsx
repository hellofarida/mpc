"use client";

import { useEffect, useRef } from "react";
import { logEvent } from "@/lib/events";

export function GardenViewLogger({ siteId }: { siteId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    logEvent("garden_view", { siteId });
  }, [siteId]);
  return null;
}
