"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface HeroSearchFormProps {
  categories: string[];
  parishes: string[];
}

export function HeroSearchForm({ categories, parishes }: HeroSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [parish, setParish] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (parish && parish !== "All Parishes") params.set("parish", parish);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-2 rounded-xl bg-white p-2 shadow-lg sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            name="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What service are you looking for?"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            aria-label="Search services"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          aria-label="Service category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={parish}
          onChange={(e) => setParish(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          aria-label="Parish"
        >
          {parishes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="shrink-0 rounded-lg bg-brand-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Search
        </button>
      </div>
    </form>
  );
}
