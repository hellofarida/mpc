import L from "leaflet";

const cache = new Map<boolean, L.DivIcon>();

/** A map pin (teardrop). `on` = highlighted: bigger and green. The tip of the pin sits on the site. */
export function pinIcon(on: boolean): L.DivIcon {
  const hit = cache.get(on);
  if (hit) return hit;
  const w = on ? 34 : 26;
  const h = on ? 44 : 34;
  const icon = L.divIcon({
    className: "",
    html: `<svg width="${w}" height="${h}" viewBox="0 0 26 34" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))" aria-hidden="true"><path d="M13 33C13 33 2 20.5 2 13a11 11 0 1 1 22 0c0 7.5-11 20-11 20z" fill="${on ? "#3b6d11" : "#b45309"}" stroke="#fff" stroke-width="2"/><circle cx="13" cy="13" r="4.5" fill="#fff"/></svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  });
  cache.set(on, icon);
  return icon;
}
