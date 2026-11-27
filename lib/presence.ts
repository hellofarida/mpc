"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getDeviceId } from "@/lib/device";
import { supabase } from "@/lib/supabase/client";

/**
 * "People online right now", from a live WebSocket connection (Supabase Realtime Presence). While a visitor has the
 * guide open and visible, their browser holds a connection and is listed in the channel; close the tab, lock the
 * phone or switch away and they drop out within seconds. Nothing is written to the database.
 *
 * Privacy: the only thing shared is an anonymous key made by hashing the device id with a fixed word, so it can't be
 * turned back into the device id (the device id must stay private: it identifies a check-in). The channel is public,
 * so anyone with the site's public key could count or spoof visitors: it is a count, not a record.
 * Development and production use different channels so testing doesn't inflate the real number.
 */
export const PRESENCE_CHANNEL = process.env.NODE_ENV === "production" ? "presence-live" : "presence-dev";

async function presenceKey(): Promise<string> {
  const bytes = new TextEncoder().encode(`mpc-presence:${getDeviceId()}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Start counting this visitor as online while the page is visible. Returns a function that stops it. */
export function startPresence(): () => void {
  let channel: RealtimeChannel | null = null;
  let stopped = false;
  let subscribed = false;

  const sync = () => {
    if (!channel || !subscribed) return;
    if (document.visibilityState === "visible") void channel.track({ on: 1 });
    else void channel.untrack();
  };

  void (async () => {
    try {
      const key = await presenceKey();
      if (stopped) return;
      channel = supabase().channel(PRESENCE_CHANNEL, { config: { presence: { key } } });
      channel.subscribe((status) => {
        subscribed = status === "SUBSCRIBED";
        if (subscribed) sync();
      });
    } catch {
      /* no WebSocket or crypto here: the visitor simply isn't counted */
    }
  })();

  document.addEventListener("visibilitychange", sync);
  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", sync);
    if (channel) void supabase().removeChannel(channel);
  };
}
