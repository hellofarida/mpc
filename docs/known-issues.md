# Known issues

## Back button from a garden page throws a runtime error (found and fixed 26 Nov 2026)
- **Symptom:** using the browser's back button from a garden page (`/sites/[id]`) shows `Runtime TypeError: Cannot read properties of undefined (reading 'appendChild')`.
- **Seen in:** local dev (localhost). Not yet checked in a production build or on a phone.
- **Guess (unverified):** the Leaflet map (`components/site-map.tsx`, client-only) is being re-mounted or restored when returning to `/`, with `cacheComponents` / Activity keeping the old tree, so Leaflet looks for a container that no longer exists.
- **To do:** reproduce (map → garden → back), read the stack trace, test in `next build && next start`, then fix.

- **Cause (confirmed):** with `cacheComponents` the map page is hidden on navigation, which runs Leaflet's cleanup (`map.remove()`); on Back the same destroyed map was reused ("Map container is being reused", then `appendChild`).
- **Fix:** `components/site-map.tsx` mounts a fresh `MapContainer` each time the page becomes visible. Verified in dev (map → garden → back: no errors, 8 pins, tiles load). Not yet checked in a production build or on a phone.
