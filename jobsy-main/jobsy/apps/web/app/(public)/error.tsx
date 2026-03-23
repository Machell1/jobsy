"use client";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-900">
          Something went wrong
        </h2>
        <p className="mt-2 text-neutral-500">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-brand-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
