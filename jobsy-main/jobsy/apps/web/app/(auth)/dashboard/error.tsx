"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold text-neutral-900">Dashboard Error</h2>
      <p className="mt-2 text-neutral-500">
        {error.message || "Failed to load dashboard data."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-brand-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Try again
      </button>
    </main>
  );
}
