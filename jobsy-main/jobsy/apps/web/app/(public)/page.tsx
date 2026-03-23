import Link from "next/link";
import type { Metadata } from "next";
import { SERVICE_CATEGORIES, PARISHES } from "@jobsy/config";
import { HeroSearchForm } from "./hero-search-form";

export const metadata: Metadata = {
  title: "Jobsy -- Jamaica's Premier Service Marketplace",
  description:
    "Find trusted service providers across Jamaica. From home repairs to beauty services, Jobsy connects you with skilled professionals in every parish.",
  openGraph: {
    title: "Jobsy -- Jamaica's Premier Service Marketplace",
    description:
      "Find trusted service providers across every parish in Jamaica.",
    url: "https://jobsyja.com",
    siteName: "Jobsy",
    type: "website",
  },
};

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, string> = {
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

const STEPS = [
  {
    number: 1,
    title: "Post a Job",
    description:
      "Describe what you need done. Set your budget and timeline so providers can find you.",
  },
  {
    number: 2,
    title: "Get Bids",
    description:
      "Qualified providers send proposals. Compare ratings, reviews, and prices.",
  },
  {
    number: 3,
    title: "Hire & Pay",
    description:
      "Choose your provider and pay securely through the platform when the job is complete.",
  },
];

const FEATURED_SERVICES = [
  {
    id: "1",
    title: "Professional Home Cleaning",
    provider: "Sparkle Clean JA",
    parish: "Kingston",
    rating: 4.9,
    reviews: 127,
    price: "J$5,000",
    category: "Cleaning",
  },
  {
    id: "2",
    title: "Electrical Wiring & Repair",
    provider: "PowerFix Solutions",
    parish: "St. Andrew",
    rating: 4.8,
    reviews: 89,
    price: "J$8,000",
    category: "Electrical",
  },
  {
    id: "3",
    title: "Garden & Lawn Care",
    provider: "GreenThumb Jamaica",
    parish: "St. Catherine",
    rating: 4.7,
    reviews: 64,
    price: "J$4,500",
    category: "Landscaping",
  },
  {
    id: "4",
    title: "Plumbing Installation",
    provider: "FlowRight Plumbing",
    parish: "St. James",
    rating: 4.9,
    reviews: 112,
    price: "J$7,000",
    category: "Plumbing",
  },
];

const TESTIMONIALS = [
  {
    name: "Keisha Brown",
    role: "Homeowner, Kingston",
    text: "Jobsy made it so easy to find a reliable electrician. The whole process from posting to payment was smooth.",
    rating: 5,
  },
  {
    name: "Marcus Thompson",
    role: "Plumber, St. Andrew",
    text: "As a service provider, Jobsy has brought me steady work. The platform connects me with real customers every week.",
    rating: 5,
  },
  {
    name: "Tanya Williams",
    role: "Small Business Owner",
    text: "I found a great carpenter through Jobsy to renovate my shop. Fair prices and the reviews helped me pick right.",
    rating: 5,
  },
];

/* ------------------------------------------------------------------ */
/*  Page component (Server Component)                                  */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://jobsyja.com/#organization",
        name: "Jobsy",
        url: "https://jobsyja.com",
        description:
          "Jamaica's premier service marketplace connecting customers with trusted local professionals.",
      },
      {
        "@type": "WebSite",
        "@id": "https://jobsyja.com/#website",
        url: "https://jobsyja.com",
        name: "Jobsy",
        publisher: { "@id": "https://jobsyja.com/#organization" },
        potentialAction: {
          "@type": "SearchAction",
          target: "https://jobsyja.com/search?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-brand-primary to-blue-900 px-4 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-lg font-semibold text-brand-accent">Jobsy</p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Jamaica&apos;s Premier Service Marketplace
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-200 md:text-xl">
            Find trusted service providers across every parish. From plumbing to
            beauty, connect with skilled professionals in your community.
          </p>

          {/* Search bar (client component for interactivity) */}
          <div className="mt-10">
            <HeroSearchForm
              categories={SERVICE_CATEGORIES.map((c) => c.label)}
              parishes={["All Parishes", ...PARISHES]}
            />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURED SERVICES                                           */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 md:text-3xl">
              Featured Services
            </h2>
            <p className="text-neutral-500">Top-rated providers ready to help</p>
          </div>
          <Link
            href="/search"
            className="hidden items-center gap-1 text-sm font-medium text-brand-primary hover:underline sm:inline-flex"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_SERVICES.map((svc) => (
            <Link
              key={svc.id}
              href={`/provider/${svc.id}`}
              className="group overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="bg-neutral-100 p-6 text-center text-4xl">
                {CATEGORY_ICONS[svc.category.toLowerCase()] ?? "\u{2699}"}
              </div>
              <div className="space-y-2 p-4">
                <span className="inline-block rounded-full bg-brand-secondary/10 px-2 py-0.5 text-xs font-medium text-brand-secondary">
                  {svc.category}
                </span>
                <h3 className="font-semibold leading-snug text-neutral-900 group-hover:text-brand-primary">
                  {svc.title}
                </h3>
                <p className="text-sm text-neutral-500">{svc.provider}</p>
                <p className="flex items-center gap-1 text-sm text-neutral-500">
                  <span aria-hidden="true">{"\u{1F4CD}"}</span>
                  {svc.parish}
                </p>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                  <div className="flex items-center gap-1 text-sm">
                    <span
                      className="text-brand-accent"
                      aria-label={`${svc.rating} out of 5 stars`}
                    >
                      {"\u{2B50}"}
                    </span>
                    <span className="font-medium">{svc.rating}</span>
                    <span className="text-neutral-400">({svc.reviews})</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-primary">
                    From {svc.price}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/search"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
          >
            View all services &rarr;
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  POPULAR CATEGORIES                                          */}
      {/* ============================================================ */}
      <section id="categories" className="bg-neutral-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 md:text-3xl">
              Popular Categories
            </h2>
            <p className="text-neutral-500">
              Browse our most requested service categories
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {SERVICE_CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                href={`/search?category=${encodeURIComponent(cat.label)}`}
                className="group flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-brand-primary/30 hover:shadow-md"
              >
                <span
                  className="text-3xl transition-transform group-hover:scale-110"
                  aria-hidden="true"
                >
                  {CATEGORY_ICONS[cat.key] ?? "\u{2699}"}
                </span>
                <span className="text-sm font-medium text-neutral-700">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                */}
      {/* ============================================================ */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 md:text-3xl">
              How It Works
            </h2>
            <p className="text-neutral-500">
              Three simple steps to get any job done
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="relative mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary text-2xl font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  {step.title}
                </h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-neutral-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS                                                */}
      {/* ============================================================ */}
      <section className="bg-neutral-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 md:text-3xl">
              What Our Community Says
            </h2>
            <p className="text-neutral-500">
              Real feedback from Jamaicans using Jobsy every day
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="relative rounded-xl border border-neutral-200 bg-white p-6"
              >
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span
                      key={i}
                      className="text-brand-accent"
                      aria-hidden="true"
                    >
                      {"\u{2B50}"}
                    </span>
                  ))}
                </div>
                <p className="mb-5 text-sm leading-relaxed text-neutral-600">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary"
                    aria-hidden="true"
                  >
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-neutral-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA                                                         */}
      {/* ============================================================ */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-brand-primary to-blue-900 p-10 text-center text-white">
          <h2 className="text-2xl font-bold md:text-3xl">
            Ready to Get Started?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-blue-200">
            Join thousands of Jamaicans already using Jobsy to find and offer
            services. Sign up today and connect with your community.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-lg bg-white px-8 py-3 text-sm font-semibold text-brand-primary shadow hover:bg-blue-50"
            >
              Sign Up Free
            </Link>
            <Link
              href="/search"
              className="rounded-lg border-2 border-white/50 px-8 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Browse Services
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
