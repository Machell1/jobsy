import type { Metadata } from "next";
import { LeftPanel } from "./homepage/LeftPanel";
import { RightPanel } from "./homepage/RightPanel";

export const metadata: Metadata = {
  title: "Jobsy — Jamaica's Service Marketplace",
  description:
    "Find and book trusted local service providers across every parish in Jamaica.",
  openGraph: {
    title: "Jobsy — Jamaica's Service Marketplace",
    description: "Find trusted service providers across every parish in Jamaica.",
    url: "https://jobsyja.com",
    siteName: "Jobsy",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      <LeftPanel />
      <RightPanel />
    </main>
  );
}
