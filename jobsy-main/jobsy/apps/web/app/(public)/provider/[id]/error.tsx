"use client";

import Link from "next/link";

export default function ProviderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold text-neutral-900">
        Could not load provider
      </h2>
      <p className="mt-2 text-neutral-500">
        {error.message || "An error occurred loading this provider profile."}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-brand-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
        <Link
          href="/search"
          className="text-sm font-medium text-brand-primary hover:underline"
        >
          &larr; Back to search
        </Link>
      </div>
    </main>
  );
}
