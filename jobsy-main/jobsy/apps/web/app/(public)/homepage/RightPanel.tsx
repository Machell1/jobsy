"use client";

import { useState } from "react";
import { CyclingSearch } from "./CyclingSearch";
import { CategoryPills } from "./CategoryPills";
import { ProviderGrid } from "./ProviderGrid";
import { LiveActivity } from "./LiveActivity";

export function RightPanel() {
  const [filter, setFilter] = useState("All");

  return (
    <div className="relative flex w-full flex-col bg-[#F8F7F5] md:w-[60%] md:h-screen">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10 md:overflow-y-auto">
        {/* Search bar */}
        <CyclingSearch />

        {/* Category pills */}
        <div className="mt-5">
          <CategoryPills onSelect={setFilter} />
        </div>

        {/* Provider grid */}
        <div className="mt-6">
          <ProviderGrid filter={filter} />
        </div>
      </div>

      {/* Activity bar fixed at bottom */}
      <div className="shrink-0 border-t border-[#E0DDD7] bg-[#F8F7F5] px-6 py-3 md:px-10">
        <LiveActivity />
      </div>
    </div>
  );
}
