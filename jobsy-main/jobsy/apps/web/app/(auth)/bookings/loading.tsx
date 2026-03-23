export default function BookingsLoading() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded bg-neutral-200" />

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
          />
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-neutral-200 pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-5 w-16 animate-pulse rounded bg-neutral-200"
          />
        ))}
      </div>

      {/* List skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
          />
        ))}
      </div>
    </main>
  );
}
