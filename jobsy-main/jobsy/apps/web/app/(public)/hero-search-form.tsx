"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface HeroSearchFormProps {
  categories: string[];
}

export function HeroSearchForm({ categories }: HeroSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-2 rounded-[14px] bg-white/[0.08] p-2 ring-1 ring-white/10 backdrop-blur-sm sm:flex-row">
        {/* Search input */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
            strokeWidth={1.5}
          />
          <input
            type="text"
            name="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What service do you need?"
            className="w-full rounded-[10px] border-0 bg-white/[0.06] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-bright)]/50"
            aria-label="Search services"
          />
        </div>

        {/* Category select */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-[10px] border-0 bg-white/[0.06] px-4 py-3.5 text-sm text-white/80 focus:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-bright)]/50 [&>option]:text-[var(--color-neutral-950)]"
          aria-label="Service category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Submit */}
        <button
          type="submit"
          className="btn-press shrink-0 rounded-[10px] bg-[var(--color-gold-bright)] px-6 py-3.5 text-sm font-semibold text-[var(--color-neutral-950)] transition-all hover:brightness-110"
        >
          Search
        </button>
      </div>
    </form>
  );
}
