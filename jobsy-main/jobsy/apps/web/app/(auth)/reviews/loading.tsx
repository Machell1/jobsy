export default function ReviewsLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded bg-neutral-200" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
          />
        ))}
      </div>
    </main>
  );
}
