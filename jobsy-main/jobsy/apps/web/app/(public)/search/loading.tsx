export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <div className="h-8 w-64 animate-pulse rounded bg-neutral-200" />
        <div className="mt-2 h-5 w-96 animate-pulse rounded bg-neutral-100" />
      </div>

      {/* Search bar skeleton */}
      <div className="flex gap-2">
        <div className="h-12 flex-1 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-12 w-24 animate-pulse rounded-lg bg-neutral-200" />
      </div>

      {/* Results skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-lg border border-neutral-200 bg-neutral-100"
          />
        ))}
      </div>
    </main>
  );
}
