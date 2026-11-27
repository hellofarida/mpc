import type { Metadata } from "next";
import { GetInvolvedContent } from "@/components/get-involved-content";

export const metadata: Metadata = { title: "Get involved – MPC guide" };

export default function GetInvolvedPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8">
      <GetInvolvedContent />
    </main>
  );
}
