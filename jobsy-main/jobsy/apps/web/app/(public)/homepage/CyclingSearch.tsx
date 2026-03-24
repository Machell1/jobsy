"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";

const PLACEHOLDERS = [
  "Find a plumber in Kingston...",
  "Find an electrician near me...",
  "Find a cleaner this weekend...",
  "Find a photographer for events...",
  "Find a gardener in Montego Bay...",
];

export function CyclingSearch() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        setFade(true);
      }, 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" strokeWidth={1.5} />
      <input
        type="text"
        className="w-full rounded-[14px] border border-[#E0DDD7] bg-white py-4 pl-12 pr-4 text-sm text-[#0D0D0B] shadow-sm transition-shadow placeholder:text-neutral-400 focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
        placeholder={PLACEHOLDERS[index]}
        style={{
          transition: "opacity 200ms ease",
        }}
      />
      {/* Animated placeholder overlay for smooth cycling */}
      <div
        className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 text-sm text-[#8A8A80]"
        style={{
          opacity: fade ? 0 : 0,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
