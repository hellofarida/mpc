import { Home } from "@/components/home";
import { GardenDetail } from "@/components/garden-detail";
import { getSites } from "@/lib/content";
import type { RouteFile } from "@/lib/route";
import type { SiteImage } from "@/lib/site-images";
import imagesData from "@/data/site-images.json";
import routeData from "@/data/route.json";

export default async function Page() {
  const sites = await getSites();
  // Each garden's page content is rendered on the server and slid out by the explorer when a site is chosen.
  const details = Object.fromEntries(sites.map((s) => [s.id, <GardenDetail key={s.id} id={s.id} />]));
  return <Home sites={sites} route={routeData as unknown as RouteFile} images={imagesData as Record<string, SiteImage>} details={details} />;
}
