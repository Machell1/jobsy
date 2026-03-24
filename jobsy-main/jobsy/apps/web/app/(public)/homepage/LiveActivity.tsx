"use client";

export function LiveActivity() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-[10px] bg-white/80 px-4 py-2.5 backdrop-blur-sm border border-[#E0DDD7]">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0A7B55] opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0A7B55]" />
      </span>
      <span className="text-sm text-[#4A4A42]">
        <span className="font-semibold text-[#0D0D0B]">23</span> bookings completed today
      </span>
    </div>
  );
}
