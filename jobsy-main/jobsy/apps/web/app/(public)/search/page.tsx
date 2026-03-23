import type { Metadata } from "next";
import { SearchPageClient } from "./search-client";

export const metadata: Metadata = {
  title: "Search Providers | Jobsy",
  description:
    "Find skilled service providers across Jamaica. Filter by category, parish, rating, and more.",
};

export default function SearchPage() {
  return <SearchPageClient />;
}
