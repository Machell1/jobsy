"use client";

import { InlineAuth } from "./InlineAuth";

export function LeftPanel() {
  return (
    <div className="relative flex w-full flex-col justify-between bg-[#08090A] px-6 py-8 md:w-[40%] md:min-h-screen md:px-10 md:py-10">
      {/* Top section */}
      <div>
        {/* Logo lockup */}
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full bg-[#6366F1]" />
          <span className="font-display text-xl font-bold text-white tracking-tight">
            Jobsy
          </span>
        </div>

        {/* Headline */}
        <div className="mt-10 md:mt-14">
          <h1 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl lg:text-[2.75rem]">
            Every service.
            <br />
            Every parish.
          </h1>
          <p className="mt-3 font-display text-xl font-semibold text-[#6366F1] md:text-2xl">
            One platform.
          </p>
        </div>

        {/* Trust text */}
        <div className="mt-6 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0A7B55] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0A7B55]" />
          </span>
          <span className="text-sm text-white/60">
            500+ verified providers across Jamaica
          </span>
        </div>

        {/* Auth form */}
        <div className="mt-8 max-w-sm">
          <InlineAuth />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 md:mt-0">
        <p className="text-xs text-white/30">
          Made with love in Jamaica &middot; &copy; 2026 Jobsy
        </p>
      </div>
    </div>
  );
}
