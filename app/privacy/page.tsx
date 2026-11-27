import type { Metadata } from "next";
import Link from "next/link";
import { FULL_CHECKIN } from "@/lib/flags";

export const metadata: Metadata = { title: "Privacy – MPC guide" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6 text-sm leading-relaxed">
      <Link className="text-xs underline" href="/">
        ← Back to the map
      </Link>
      <h1 className="text-2xl font-semibold">Privacy</h1>
      <p>
        This is a prototype made by a Le Wagon student. It is not an official Heartscapes service. We keep as
        little as possible, and nothing that says who you are.
      </p>

      <section className="space-y-1">
        <h2 className="text-base font-semibold">What we store</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            A random anonymous device ID, kept in your browser&apos;s localStorage. It is not linked to a name,
            email or account.
          </li>
          <li>
            When you tap a check-in (&quot;I&apos;m here!&quot;): the garden, how you got here, the time and your
            device ID.
          </li>
          <li>
            Simple step events (for example opening a garden, tapping Directions, or opening a walk): the event,
            the garden, the time and your device ID.
          </li>
          {FULL_CHECKIN && (
            <li>
              If you choose to, your favourite garden and one short line about your visit, saved with that check-in.
              Comments are only read by the project team, are never shown publicly and are never quoted by the chatbot.
              Please don&apos;t put names, contact details or links in them (we block emails, links and phone numbers).
            </li>
          )}
          <li>
            A random ID for each visit, kept only in your browser tab (not a cookie) and gone when you close it. It lets
            us count visits and see how far people got, for example how many opened a garden.
          </li>
          <li>
            Signs that something went wrong or was annoying, each as a short fixed label with the time and your
            anonymous IDs: for example tapping the same spot several times quickly, an error, a slow answer, opening a
            garden and closing it straight away, cancelling the &quot;You&apos;re leaving&quot; box, or a question the chatbot couldn&apos;t answer (the kind of question, never the words). We also note
            whether you&apos;re on a phone, tablet or computer, and sometimes how fast the page loaded.
          </li>
          <li>We do not store your name, email, or location, and never what you type, where you tap on the screen, or what is on your screen.</li>
        </ul>
      </section>

      <section className="space-y-1">
        <h2 className="text-base font-semibold">Your location</h2>
        <p>
          This guide doesn&apos;t ask for your location. When you open directions or a walk in Google or Apple Maps,
          those apps may ask for it and handle it under their own policies.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="text-base font-semibold">Questions to the AI</h2>
        <p>
          When you ask a question about a garden, the text of your question and a few garden facts are sent to an AI
          service (Anthropic) to write the answer. Please don&apos;t type personal details. Your device ID, location
          and the names of observers are not sent. Answers and summaries written by AI are labelled &quot;written by
          AI&quot;, and the numbers in them are checked by code.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="text-base font-semibold">Sightings and photos</h2>
        <p>
          Sightings come from the{" "}
          <a
            className="underline"
            href="https://www.inaturalist.org/projects/melbourne-pollinator-corridor"
            target="_blank"
            rel="noopener noreferrer"
          >
            MPC project on iNaturalist
          </a>
          . Observations are shared under CC BY-NC by their observers, who are credited next to each sighting.
          Photos load directly from iNaturalist.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="text-base font-semibold">Cookies and third parties</h2>
        <p>
          No cookies and no third-party scripts, ads or tracking. We count visits ourselves, with the anonymous steps above. The Join and Volunteer buttons open Heartscapes with a tag in the link (the button and garden you came from, and &quot;mpc-guide&quot;), so Heartscapes can see how many people came from this guide. The tag says nothing about you. The map tiles come from OpenStreetMap, so that
          service sees your device&apos;s IP address when the map loads.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="text-base font-semibold">Deleting your data</h2>
        <p>
          You can clear your device ID any time by clearing this site&apos;s data in your browser. To have the
          check-ins and events linked to your device ID deleted, send us that ID (the contact for this prototype is
          the Heartscapes link in the app) and we will remove them. Because the data has no names, we can only find
          records if you give us the ID.
        </p>
      </section>
    </main>
  );
}
