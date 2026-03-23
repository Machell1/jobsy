export default function SavedSearchesLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
          />
        ))}
      </div>
    </main>
  );
}
