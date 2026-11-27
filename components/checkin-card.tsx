"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { commentProblem, MAX_COMMENT_CHARS } from "@/lib/comment";
import { checkIn, checkinDetails, logEvent, type TravelMode } from "@/lib/events";
import { FULL_CHECKIN } from "@/lib/flags";

const MODES: { mode: TravelMode; label: string }[] = [
  { mode: "walked", label: "Walked" },
  { mode: "cycled", label: "Cycled" },
  { mode: "ran", label: "Ran" },
  { mode: "other", label: "Other" },
];

export function CheckInCard({ siteId, sites }: { siteId: string; sites: { id: string; name: string }[] }) {
  const [state, setState] = useState<"idle" | "busy" | "saved" | "repeat" | "error">("idle");
  const [details, setDetails] = useState<"open" | "saving" | "done" | "skipped" | "error">("open");
  const [favourite, setFavourite] = useState("");
  const [comment, setComment] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  async function tap(mode: TravelMode) {
    setState("busy");
    const r = await checkIn(siteId, mode);
    if (r === "error") logEvent("error", { siteId, detail: "checkin-failed" });
    setState(r);
  }

  async function saveDetails() {
    const issue = commentProblem(comment);
    if (issue) return setProblem(issue);
    setProblem(null);
    setDetails("saving");
    const r = await checkinDetails(siteId, favourite || null, comment.trim() || null);
    if (r === "error") logEvent("error", { siteId, detail: "checkin-details-failed" });
    setDetails(r === "error" ? "error" : "done");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>I&apos;m here!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {state === "saved" && <p role="status">Thanks for checking in! 🐝</p>}
        {state === "saved" && FULL_CHECKIN && details !== "skipped" && (
          <div className="space-y-2 border-t pt-3">
            {details === "done" ? (
              <p role="status" className="text-sm">
                Thanks, that helps!
              </p>
            ) : (
              <>
                <p className="text-sm font-medium">Anything to add? (optional)</p>
                <label className="block space-y-1 text-sm">
                  <span>Your favourite garden</span>
                  <select
                    value={favourite}
                    onChange={(e) => setFavourite(e.target.value)}
                    className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
                  >
                    <option value="">Not sure yet</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  <span>One line about your visit</span>
                  <Input
                    value={comment}
                    maxLength={MAX_COMMENT_CHARS}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setProblem(null);
                    }}
                    placeholder="Bees on the lavender"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Please don&apos;t include names, contact details or links. Comments are only read by the project team and
                  are never shown publicly.
                </p>
                {problem && (
                  <p role="alert" className="text-xs text-destructive">
                    {problem}
                  </p>
                )}
                {details === "error" && (
                  <p role="alert" className="text-xs text-destructive">
                    Sorry, we couldn&apos;t save that. Please try again.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button onClick={saveDetails} disabled={details === "saving" || (!favourite && !comment.trim())}>
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setDetails("skipped")}>
                    Skip
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
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
