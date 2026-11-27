import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AboutContent } from "@/components/about-content";
import { GetInvolvedContent } from "@/components/get-involved-content";
import { TopNav } from "@/components/top-nav";
import { Tracker } from "@/components/tracker";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MPC guide",
  description: "A prototype guide to the Melbourne Pollinator Corridor gardens.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Tracker />
        <TopNav about={<AboutContent />} involved={<GetInvolvedContent />} />
        {children}
      </body>
    </html>
  );
}
