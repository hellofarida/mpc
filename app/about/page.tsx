import type { Metadata } from "next";
import { AboutContent } from "@/components/about-content";

export const metadata: Metadata = { title: "About – MPC guide" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8">
      <AboutContent />
    </main>
  );
}
