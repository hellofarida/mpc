"use client";

import { useEffect, useState } from "react";

const COLS = 19;
const ROWS = 7;
const STEPS = 16;
const CX = 9;
const CY = 3;
const RX = 7; // wider than tall: a character cell is about twice as tall as it is wide
const RY = 2.6;

const WINGS_UP = "\\{o}/";
const WINGS_DOWN = "-{o}-";

/** Every frame is one bee position on the ellipse, with the flight path as faint dots. */
function frame(step: number): string {
  const grid = Array.from({ length: ROWS }, () => Array<string>(COLS).fill(" "));
  for (let i = 0; i < STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2;
    grid[Math.round(CY + RY * Math.sin(a))][Math.round(CX + RX * Math.cos(a))] = "·";
  }
  // start at the top and fly clockwise
  const a = (step / STEPS) * Math.PI * 2 - Math.PI / 2;
  const row = Math.round(CY + RY * Math.sin(a));
  const col = Math.round(CX + RX * Math.cos(a));
  const bee = step % 2 === 0 ? WINGS_UP : WINGS_DOWN;
  for (let i = 0; i < bee.length; i++) {
    const c = col - 2 + i;
    if (c >= 0 && c < COLS) grid[row][c] = bee[i];
  }
  return grid.map((r) => r.join("")).join("\n");
}

/** An ASCII bee flying in a circle. Stands still for people who ask for less motion. */
export function BeeSpinner({ label = "Loading" }: { label?: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS), 110);
    return () => clearInterval(id);
  }, []);

  return (
    <div role="status" className="flex flex-col items-center gap-2 p-6 text-muted-foreground">
      <pre aria-hidden="true" className="font-heading text-sm leading-tight">
        {frame(step)}
      </pre>
      <span className="font-heading text-xs">{label}…</span>
    </div>
  );
}
