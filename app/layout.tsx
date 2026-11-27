import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { Tracker } from "@/components/tracker";
import { SiteFooter } from "@/components/site-footer";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
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
      className={`${instrumentSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Tracker />
        <TopNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
