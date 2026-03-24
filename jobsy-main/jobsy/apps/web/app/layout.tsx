import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jobsy — Jamaica's Service Marketplace",
  description: "Find and book trusted local service providers across every parish in Jamaica.",
  openGraph: {
    title: "Jobsy — Jamaica's Service Marketplace",
    description: "Find trusted service providers across every parish in Jamaica.",
    url: "https://jobsyja.com",
    siteName: "Jobsy",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
