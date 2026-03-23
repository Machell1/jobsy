export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Welcome skeleton */}
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="mt-2 h-5 w-32 animate-pulse rounded bg-neutral-100" />
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
          />
        ))}
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
          />
        ))}
      </div>

      {/* Activity skeleton */}
      <div className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
    </main>
  );
}
