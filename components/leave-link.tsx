"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { logEvent } from "@/lib/events";

/**
 * Every link to another website goes through this "You're leaving the MPC guide" step.
 * Continue is a real link (so phones don't block it) and runs onContinue (used to log the tap).
 */
export function LeaveLink({
  href,
  destination,
  children,
  onContinue,
  className,
  variant = "outline",
}: {
  href: string;
  destination: string;
  children: React.ReactNode;
  onContinue?: () => void;
  className?: string;
  variant?: "default" | "outline" | "link";
}) {
  const [open, setOpen] = useState(false);
  const host = new URL(href).hostname;
  return (
    <>
      <Button variant={variant} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-title"
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
        >
          <div className="w-full max-w-sm space-y-3 rounded-xl bg-background p-4 shadow-lg">
            <h2 id="leave-title" className="text-base font-semibold">
              You&apos;re leaving the MPC guide
            </h2>
            <p className="text-sm">
              This opens <strong>{destination}</strong> ({host}) in a new tab. It&apos;s a different website with its
              own privacy rules.
            </p>
            <div className="flex gap-2">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "default" })}
                onClick={() => {
                  onContinue?.();
                  setOpen(false);
                }}
              >
                Continue
              </a>
              <Button
                variant="outline"
                onClick={() => {
                  logEvent("leave_cancel", { detail: destination.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) });
                  setOpen(false);
                }}
                autoFocus
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
