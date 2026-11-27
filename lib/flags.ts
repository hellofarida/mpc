/**
 * The fuller check-in (favourite garden + optional comment) is on while developing and OFF in production until
 * Heartscapes agree who owns the data and how long it's kept. Switch it on by setting NEXT_PUBLIC_FULL_CHECKIN=on
 * (and redeploying; NEXT_PUBLIC values are baked in at build time).
 */
export const FULL_CHECKIN = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_FULL_CHECKIN === "on";
