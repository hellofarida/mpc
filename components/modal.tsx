"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * A dialog over the whole screen. It is drawn on the page body, not inside the slide-out panel: the panel moves with a
 * transform, which would otherwise trap a "fixed" dialog inside the panel. Escape or a tap outside closes it.
 * Only render it after a tap (it needs the browser).
 */
export function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-background p-4 shadow-lg sm:rounded-2xl">{children}</div>
    </div>,
    document.body,
  );
}
