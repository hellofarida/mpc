/**
 * Tells the page roughly where this visit comes from (country, and state and city for Australia) so the analytics can
 * show visits by area. It uses the approximate lookup the hosting provider (Vercel) already does on the connection;
 * the visitor's address is never stored and their device location is never asked for. Nothing is saved here.
 */
const noStore = { "Cache-Control": "no-store" };

export function GET(request: Request) {
  const h = request.headers;
  const country = (h.get("x-vercel-ip-country") ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return Response.json({}, { headers: noStore });
  if (country !== "AU") return Response.json({ country }, { headers: noStore }); // outside Australia: country only

  const region = (h.get("x-vercel-ip-country-region") ?? "").toUpperCase();
  let city = "";
  try {
    city = decodeURIComponent(h.get("x-vercel-ip-city") ?? "");
  } catch {
    /* ignore a badly encoded value */
  }
  return Response.json(
    {
      country,
      ...(/^[A-Z0-9-]{1,8}$/.test(region) ? { region } : {}),
      ...(/^[\p{L}][\p{L} .'-]{0,59}$/u.test(city) ? { city } : {}),
    },
    { headers: noStore },
  );
}
