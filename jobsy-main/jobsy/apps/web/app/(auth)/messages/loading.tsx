export default function MessagesLoading() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded bg-neutral-200" />

      <div className="h-[calc(100vh-280px)] min-h-[500px] animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
    </main>
  );
}
