import { Home } from "@/components/home";
import { GardenDetail } from "@/components/garden-detail";
import { SITES } from "@/lib/sites";

export default function Page() {
  // Each garden's page content is rendered on the server and slid out by the explorer when a site is chosen.
  const details = Object.fromEntries(SITES.map((s) => [s.id, <GardenDetail key={s.id} id={s.id} />]));
  return <Home details={details} />;
}
