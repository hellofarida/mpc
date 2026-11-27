import type { Metadata } from "next";
import { JoinButtons, LogSightingButton } from "@/components/link-buttons";

export const metadata: Metadata = { title: "Get involved – MPC guide" };

export default function GetInvolvedPage() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-5 py-8 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Get involved</h1>
      <p>Saw something in one of the gardens? Add it to the corridor&apos;s record on iNaturalist.</p>
      <LogSightingButton />
      <p>Want to help look after the gardens? Heartscapes runs the corridor and welcomes members and volunteers.</p>
      <JoinButtons />
    </main>
  );
}
