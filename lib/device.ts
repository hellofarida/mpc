"use client";

const KEY = "mpc-device-id";

/**
 * A random, anonymous ID kept in this browser (no name, email or location).
 * Only used to link a Directions tap to a later check-in at the same garden,
 * and to ignore repeat check-ins. Clearing browser data resets it.
 */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // Private mode or storage blocked: use a one-off ID for this page load.
    return crypto.randomUUID();
  }
}
