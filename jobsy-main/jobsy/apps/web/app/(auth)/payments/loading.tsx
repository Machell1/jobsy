export default function PaymentsLoading() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded bg-neutral-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
          />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
          />
        ))}
      </div>
    </main>
  );
}
