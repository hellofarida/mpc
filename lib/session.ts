"use client";

const KEY = "mpc-session-id";

/**
 * A random ID for this visit only: it lives in this browser tab (sessionStorage, no cookie) and is gone when the tab
 * closes. It lets us count visits and see how far each one got. It is not linked to a name, email or location.
 */
export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
