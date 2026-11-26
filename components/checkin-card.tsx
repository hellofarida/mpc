"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkIn, type TravelMode } from "@/lib/events";

const MODES: { mode: TravelMode; label: string }[] = [
  { mode: "walked", label: "Walked" },
  { mode: "cycled", label: "Cycled" },
  { mode: "ran", label: "Ran" },
  { mode: "other", label: "Other" },
];

export function CheckInCard({ siteId }: { siteId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "saved" | "repeat" | "error">("idle");

  async function tap(mode: TravelMode) {
    setState("busy");
    setState(await checkIn(siteId, mode));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>I&apos;m here!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {state === "saved" && <p role="status">Thanks for checking in! 🐝</p>}
        {state === "repeat" && <p role="status">You already checked in here in the last hour.</p>}
        {state === "error" && (
          <p role="status">Sorry, we couldn&apos;t save that. Please try again in a moment.</p>
        )}
        {(state === "idle" || state === "busy" || state === "error") && (
          <>
            <p className="text-sm font-medium">How did you get here today?</p>
            <div className="grid grid-cols-4 gap-2">
              {MODES.map((m) => (
                <Button key={m.mode} variant="outline" disabled={state === "busy"} onClick={() => tap(m.mode)}>
                  {m.label}
                </Button>
              ))}
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Anonymous: we save only the garden, how you came and the time.
        </p>
      </CardContent>
    </Card>
  );
}
