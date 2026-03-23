import { PARISHES, SERVICE_CATEGORIES } from "@jobsy/config";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-brand-primary px-6 py-24 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-bold tracking-tight">
            Find Trusted Services in Jamaica
          </h1>
          <p className="mt-6 text-xl text-blue-100">
            Connect with verified local professionals for any job. From
            plumbing to photography, Jobsy has you covered.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <a
              href="/login"
              className="rounded-lg bg-white px-8 py-3 text-lg font-semibold text-brand-primary shadow-sm hover:bg-blue-50"
            >
              Get Started
            </a>
            <a
              href="#categories"
              className="rounded-lg border-2 border-white px-8 py-3 text-lg font-semibold text-white hover:bg-white/10"
            >
              Browse Services
            </a>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-neutral-900">
            Service Categories
          </h2>
          <p className="mt-3 text-center text-neutral-500">
            {SERVICE_CATEGORIES.length} categories across{" "}
            {PARISHES.length} parishes
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {SERVICE_CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-3xl" aria-hidden="true">
                  {getCategoryEmoji(cat.key)}
                </span>
                <span className="mt-3 text-sm font-medium text-neutral-700">
                  {cat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-neutral-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="mt-4 text-lg text-neutral-300">
            Join thousands of Jamaicans finding and providing quality
            services every day.
          </p>
          <a
            href="/login"
            className="mt-8 inline-block rounded-lg bg-brand-accent px-8 py-3 text-lg font-semibold text-neutral-900 hover:bg-amber-400"
          >
            Sign Up Free
          </a>
        </div>
      </section>
    </main>
  );
}

function getCategoryEmoji(key: string): string {
  const map: Record<string, string> = {
    plumbing: "\u{1F6BF}",
    electrical: "\u{26A1}",
    carpentry: "\u{1FA93}",
    cleaning: "\u{2728}",
    gardening: "\u{1F33F}",
    painting: "\u{1F3A8}",
    masonry: "\u{1F9F1}",
    roofing: "\u{1F3E0}",
    automotive: "\u{1F697}",
    catering: "\u{1F37D}",
    tutoring: "\u{1F393}",
    beauty: "\u{1F484}",
    tailoring: "\u{1FAA1}",
    moving: "\u{1F4E6}",
    tech_repair: "\u{1F4F1}",
    photography: "\u{1F4F7}",
    event_planning: "\u{1F389}",
    other: "\u{2699}",
  };
  return map[key] ?? "\u{2699}";
}
