"use client";

import { useState } from "react";
import { Star, MapPin, ShieldCheck, Heart } from "lucide-react";

const MOCK_PROVIDERS = [
  {
    id: "1",
    name: "Sparkle Clean JA",
    category: "Cleaning",
    parish: "Kingston",
    rating: 4.9,
    reviews: 127,
    price: "J$5,000",
    verified: true,
    gradient: "from-violet-500 to-indigo-600",
  },
  {
    id: "2",
    name: "PowerFix Solutions",
    category: "Electrical",
    parish: "St. Andrew",
    rating: 4.8,
    reviews: 89,
    price: "J$8,000",
    verified: true,
    gradient: "from-amber-400 to-orange-500",
  },
  {
    id: "3",
    name: "GreenThumb Jamaica",
    category: "Gardening",
    parish: "St. Catherine",
    rating: 4.7,
    reviews: 64,
    price: "J$4,500",
    verified: true,
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    id: "4",
    name: "FlowRight Plumbing",
    category: "Plumbing",
    parish: "St. James",
    rating: 4.9,
    reviews: 112,
    price: "J$7,000",
    verified: true,
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    id: "5",
    name: "Glamour Studio",
    category: "Beauty",
    parish: "Montego Bay",
    rating: 4.8,
    reviews: 95,
    price: "J$3,500",
    verified: true,
    gradient: "from-pink-400 to-rose-500",
  },
  {
    id: "6",
    name: "LensCraft Photography",
    category: "Photography",
    parish: "Portmore",
    rating: 4.9,
    reviews: 73,
    price: "J$15,000",
    verified: true,
    gradient: "from-purple-400 to-fuchsia-500",
  },
];

interface ProviderGridProps {
  filter?: string;
}

export function HomepageProviders() {
  return <ProviderGrid />;
}

export function ProviderGrid({ filter = "All" }: ProviderGridProps) {
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const filtered = filter === "All"
    ? MOCK_PROVIDERS
    : MOCK_PROVIDERS.filter((p) => p.category === filter);

  const toggleSave = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {filtered.map((provider, index) => (
        <div
          key={provider.id}
          className="provider-card card-animate overflow-hidden rounded-[14px] border border-[#E0DDD7] bg-white"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Gradient banner */}
          <div className={`relative h-24 bg-gradient-to-r ${provider.gradient}`}>
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#1C1C19] shadow-sm backdrop-blur-sm">
              {provider.category}
            </span>
            <button
              onClick={() => toggleSave(provider.id)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:scale-110"
              aria-label={saved.has(provider.id) ? "Unsave provider" : "Save provider"}
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  saved.has(provider.id)
                    ? "fill-[#F5A623] text-[#F5A623]"
                    : "text-[#4A4A42]"
                }`}
                strokeWidth={1.5}
              />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#0D0D0B]">{provider.name}</h3>
              {provider.verified && (
                <span className="inline-flex items-center justify-center rounded-full bg-[#0A7B55] p-0.5 text-white" title="Verified">
                  <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#8A8A80]">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              {provider.parish}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#E0DDD7] pt-3">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-[#0D0D0B]">{provider.rating}</span>
                <span className="text-xs text-[#8A8A80]">({provider.reviews})</span>
              </div>
              <span className="text-xs font-semibold text-[#6366F1]">
                From {provider.price}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
