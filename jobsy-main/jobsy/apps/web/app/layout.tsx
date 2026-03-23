import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jobsy — Jamaica's Service Marketplace",
  description:
    "Find and book trusted local service providers across Jamaica. Plumbing, electrical, carpentry, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
