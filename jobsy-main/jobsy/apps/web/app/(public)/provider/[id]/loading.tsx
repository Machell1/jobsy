export default function ProviderLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Back link skeleton */}
      <div className="h-5 w-24 animate-pulse rounded bg-neutral-200" />

      {/* Header skeleton */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="h-24 w-24 animate-pulse rounded-full bg-neutral-200" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-48 animate-pulse rounded bg-neutral-200" />
            <div className="h-5 w-24 animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-36 animate-pulse rounded bg-neutral-100" />
            <div className="h-16 w-full animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
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

      {/* Content skeleton */}
      <div className="h-64 animate-pulse rounded-lg border border-neutral-200 bg-neutral-100" />
    </main>
  );
}
