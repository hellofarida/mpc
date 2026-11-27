import { JoinButtons, LogSightingButton } from "@/components/link-buttons";

/** The Get involved text. Shown on /get-involved and in the pop-up from the nav. */
export function GetInvolvedContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Get involved</h1>
      <p>Saw something in one of the gardens? Add it to the corridor&apos;s record on iNaturalist.</p>
      <LogSightingButton />
      <p>Want to help look after the gardens? Heartscapes runs the corridor and welcomes members and volunteers.</p>
      <JoinButtons />
    </div>
  );
}
