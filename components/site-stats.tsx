import { PlainCard as Card, PlainCardContent as CardContent, PlainCardHeader as CardHeader, PlainCardTitle as CardTitle } from "@/components/plain-card";
import type { SiteFacts } from "@/lib/facts";
import { GROUPS, GROUP_LABELS } from "@/lib/groups";

export type MonthCount = { label: string; count: number };

/** Sightings at a glance, all worked out from the MPC iNaturalist data (see lib/facts.ts). */
export function SiteStats({ facts, months }: { facts: SiteFacts; months: MonthCount[] }) {
  const maxGroup = Math.max(1, ...GROUPS.map((g) => facts.groupCounts[g]));
  const maxMonth = Math.max(1, ...months.map((m) => m.count));
  const tile = (label: string, value: string | number) => (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sightings at a glance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-3 gap-2">
          {tile("Sightings", facts.totalSightings)}
          {tile("Species", facts.distinctSpecies)}
          {tile("Observers", facts.observers)}
        </div>

        {facts.totalSightings > 0 && (
          <>
            <div className="space-y-1.5">
              <p className="font-medium">What was seen</p>
              {GROUPS.map((g) => (
                <div key={g} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-2 text-xs">
                  <span className="capitalize">{GROUP_LABELS[g]}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(100 * facts.groupCounts[g]) / maxGroup}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{facts.groupCounts[g]}</span>
                </div>
              ))}
            </div>

            {facts.topSpecies.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium">Most recorded</p>
                <ol className="space-y-0.5 text-xs">
                  {facts.topSpecies.map((s) => (
                    <li key={s.name} className="flex justify-between gap-2">
                      <span>{s.name}</span>
                      <span className="tabular-nums text-muted-foreground">{s.sightings}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="space-y-1">
              <p className="font-medium">Sightings by month</p>
              <div className="flex h-16 items-end gap-1" role="img" aria-label="Sightings per month over the last 12 months">
                {months.map((m) => (
                  <div key={m.label} className="flex h-full flex-1 flex-col items-center justify-end" title={`${m.label}: ${m.count}`}>
                    <span className="w-full rounded-t bg-primary" style={{ height: `${(100 * m.count) / maxMonth}%`, minHeight: m.count ? 2 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-1 text-[10px] text-muted-foreground">
                {months.map((m) => (
                  <span key={m.label} className="flex-1 text-center">
                    {m.label[0]}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          From the MPC project on iNaturalist, {facts.from} to {facts.dataUpTo}
          {facts.latestSighting ? `. Latest sighting ${facts.latestSighting}` : ""}.
        </p>
      </CardContent>
    </Card>
  );
}
