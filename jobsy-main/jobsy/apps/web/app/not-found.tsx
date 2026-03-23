import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-neutral-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-brand-primary mb-4">404</div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Page not found
        </h1>
        <p className="text-neutral-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-primary/90 transition-colors duration-150"
          >
            Go Home
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors duration-150"
          >
            Browse Services
          </Link>
        </div>
        <p className="mt-8 text-sm text-neutral-500">
          Need help?{" "}
          <a
            href="mailto:support@jobsyja.com"
            className="text-brand-primary hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
