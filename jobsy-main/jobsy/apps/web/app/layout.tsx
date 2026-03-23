import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jobsy — Jamaica's Premier Service Marketplace",
  description:
    "Find and book trusted local service providers across Jamaica. From plumbing to beauty, connect with skilled professionals in every parish.",
  openGraph: {
    title: "Jobsy — Jamaica's Premier Service Marketplace",
    description: "Find trusted service providers across every parish in Jamaica.",
    url: "https://jobsyja.com",
    siteName: "Jobsy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="font-body antialiased bg-warm-white text-neutral-950">
        {children}
      </body>
    </html>
  );
}
