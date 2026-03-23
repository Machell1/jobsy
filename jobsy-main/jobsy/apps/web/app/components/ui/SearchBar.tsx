"use client";

import { useState, useRef, type FormEvent } from "react";

/* ─── Types ───────────────────────────────────────────────── */

export interface SearchBarProps {
  onSearch: (query: string, category?: string, parish?: string) => void;
  categories?: { label: string; value: string }[];
  parishes?: { label: string; value: string }[];
  placeholder?: string;
  defaultQuery?: string;
  defaultCategory?: string;
  defaultParish?: string;
  className?: string;
}

/* ─── Icons ───────────────────────────────────────────────── */

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export function SearchBar({
  onSearch,
  categories = [],
  parishes = [],
  placeholder = "Find a service near you...",
  defaultQuery = "",
  defaultCategory = "",
  defaultParish = "",
  className = "",
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [category, setCategory] = useState(defaultCategory);
  const [parish, setParish] = useState(defaultParish);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query.trim(), category || undefined, parish || undefined);
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search for services"
      className={[
        "w-full rounded-xl bg-white shadow-lg border border-neutral-200",
        "flex flex-col sm:flex-row items-stretch",
        className,
      ].join(" ")}
    >
      {/* Search input */}
      <div className="relative flex-1 min-w-0">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full h-14 pl-12 pr-10 text-base text-neutral-900 placeholder:text-neutral-400 bg-transparent border-0 focus:outline-none focus:ring-0"
          aria-label="Search query"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 cursor-pointer"
            aria-label="Clear search"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {/* Dividers + dropdowns */}
      {(categories.length > 0 || parishes.length > 0) && (
        <div className="flex items-stretch border-t sm:border-t-0 sm:border-l border-neutral-200">
          {categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-14 px-4 text-sm text-neutral-700 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer appearance-none min-w-[140px]"
              aria-label="Category filter"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          {parishes.length > 0 && (
            <>
              <div className="w-px bg-neutral-200 self-stretch" />
              <select
                value={parish}
                onChange={(e) => setParish(e.target.value)}
                className="h-14 px-4 text-sm text-neutral-700 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer appearance-none min-w-[140px]"
                aria-label="Parish filter"
              >
                <option value="">All Parishes</option>
                {parishes.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className={[
          "h-14 px-6 text-sm font-medium text-white bg-brand-primary",
          "hover:bg-blue-700 transition-colors cursor-pointer",
          "sm:rounded-r-xl rounded-b-xl sm:rounded-bl-none",
          "min-w-[44px] flex items-center justify-center gap-2",
        ].join(" ")}
        aria-label="Search"
      >
        <SearchIcon />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
