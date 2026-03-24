import type { Metadata } from "next";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { InlineAuth } from "../components/auth/InlineAuth";
import { CategoryTile } from "../components/CategoryTile";
import { HomepageProviders } from "./homepage/ProviderGrid";

export const metadata: Metadata = {
  title: "Jobsy — Jamaica's Service Marketplace",
  description:
    "Find and book trusted local service providers across every parish in Jamaica.",
  openGraph: {
    title: "Jobsy — Jamaica's Service Marketplace",
    description: "Find trusted service providers across every parish in Jamaica.",
    url: "https://jobsyja.com",
    siteName: "Jobsy",
    type: "website",
  },
};

const POPULAR_SEARCHES = [
  "Plumber",
  "Electrician",
  "House Cleaning",
  "Gardener",
  "Photographer",
  "AC Repair",
];

const CATEGORIES = [
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Beauty",
  "Gardening",
  "Photography",
  "Carpentry",
  "Painting",
  "Catering",
  "Moving",
  "Tutoring",
  "Roofing",
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Search & Compare",
    description:
      "Browse verified providers by category or location. Read reviews from real Jamaicans to find the perfect match.",
  },
  {
    step: "02",
    title: "Book Instantly",
    description:
      "Choose a time that works for you and book in seconds. Your payment is held securely until the job is done.",
  },
  {
    step: "03",
    title: "Get It Done",
    description:
      "Your provider arrives on time, completes the work, and you release payment when you are satisfied.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F8F7F5]">
      {/* Floating ThemeToggle */}
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — Light Hero
         ═══════════════════════════════════════════════════════ */}
      <section className="relative bg-[#F8F7F5]">
        {/* Subtle radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(200,134,26,0.06)_0%,_transparent_60%)]" />

        <div className="relative mx-auto max-w-5xl px-6 pb-16 pt-16 md:pt-24">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-[#0F2556]" />
            <span className="font-display text-xl font-bold tracking-tight text-[#0D0D0B]">
              Jobsy
            </span>
          </div>

          {/* Trust badge */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#E0DDD7] bg-white px-4 py-2 shadow-[0_1px_2px_rgb(8_9_10/0.04)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm text-[#4A4A42]">500+ verified professionals</span>
          </div>

          {/* Headline */}
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-[#0D0D0B] md:text-5xl lg:text-6xl">
            Every service.
            <br />
            Every parish.
            <br />
            <span className="text-[#0F2556]">One platform.</span>
          </h1>

          <p className="mt-4 text-lg text-[#8A8A80]">
            Find trusted local service providers in your city
          </p>

          {/* Search bar */}
          <form
            action="/search"
            className="mt-8 flex max-w-2xl flex-col gap-3 rounded-[14px] border border-[#E0DDD7] bg-white p-2 shadow-md sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A8A80]" strokeWidth={1.5} />
              <input
                type="text"
                name="q"
                placeholder="What service do you need?"
                className="w-full rounded-[10px] border-0 bg-transparent py-3.5 pl-11 pr-4 text-sm text-[#0D0D0B] placeholder:text-[#8A8A80] focus:outline-none"
                aria-label="Search services"
              />
            </div>
            <button
              type="submit"
              className="btn-press shrink-0 rounded-[10px] bg-[#0F2556] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A1A3D]"
            >
              Search
            </button>
          </form>

          {/* Popular pills */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#8A8A80]">Popular:</span>
            {POPULAR_SEARCHES.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="rounded-full border border-[#E0DDD7] px-3 py-1.5 text-sm text-[#4A4A42] transition-colors hover:border-[#0F2556]/30 hover:text-[#0F2556]"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — Inline Auth
         ═══════════════════════════════════════════════════════ */}
      <section className="border-t border-[#E0DDD7] pt-10 mt-0">
        <div className="mx-auto max-w-5xl px-6 pb-16">
          <InlineAuth />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — Categories
         ═══════════════════════════════════════════════════════ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-display text-2xl font-bold text-[#0D0D0B] md:text-3xl">
            Browse by Category
          </h2>
          <p className="mt-2 text-[#8A8A80]">
            Find the right professional for any job
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {CATEGORIES.map((cat) => (
              <CategoryTile key={cat} category={cat} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — Featured Providers
         ═══════════════════════════════════════════════════════ */}
      <section className="bg-[#F8F7F5] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#0D0D0B] md:text-3xl">
                Featured Providers
              </h2>
              <p className="mt-2 text-[#8A8A80]">
                Top-rated professionals across Jamaica
              </p>
            </div>
            <Link
              href="/search"
              className="hidden items-center gap-1 text-sm font-medium text-[#0F2556] hover:underline sm:flex"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8">
            <HomepageProviders />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — How It Works
         ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-display text-2xl font-bold text-[#0D0D0B] md:text-3xl">
            How Jobsy Works
          </h2>
          <p className="mt-2 text-center text-[#8A8A80]">
            Three simple steps to get the job done
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="rounded-[14px] border border-[#E0DDD7] bg-[#FAFAF7] p-6 shadow-[var(--shadow-xs)]"
              >
                <span className="font-display text-3xl font-bold text-[#0F2556]/20">
                  {item.step}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-[#0D0D0B]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4A4A42]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — Dark CTA
         ═══════════════════════════════════════════════════════ */}
      <section className="bg-[#08090A] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
            Ready to find your next
            <span className="text-[#F5A623]"> service provider</span>?
          </h2>
          <p className="mt-4 text-white/60">
            Join thousands of Jamaicans who trust Jobsy to connect them with verified professionals.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="btn-press inline-flex items-center gap-2 rounded-[10px] bg-[#6366F1] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4F46E5]"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-[10px] border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Browse providers
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7 — Footer
         ═══════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#E0DDD7] bg-[#F8F7F5] py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#0F2556]" />
                <span className="font-display text-lg font-bold text-[#0D0D0B]">Jobsy</span>
              </div>
              <p className="mt-3 text-sm text-[#8A8A80]">
                Jamaica&apos;s trusted marketplace for local service professionals.
              </p>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-[#0D0D0B]">Company</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/about" className="text-sm text-[#8A8A80] hover:text-[#0D0D0B]">About</Link></li>
                <li><Link href="/careers" className="text-sm text-[#8A8A80] hover:text-[#0D0D0B]">Careers</Link></li>
                <li><Link href="/blog" className="text-sm text-[#8A8A80] hover:text-[#0D0D0B]">Blog</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-semibold text-[#0D0D0B]">Support</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/help" className="text-sm text-[#8A8A80] hover:text-[#0D0D0B]">Help Center</Link></li>
                <li><Link href="/safety" className="text-sm text-[#8A8A80] hover:text-[#0D0D0B]">Safety</Link></li>
                <li><Link href="/contact" className="text-sm text-[#8A8A80] hover:text-[#0D0D0B]">Contact Us</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-[#0D0D0B]">Legal</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/terms" className="text-sm text-[#8A8A80] hover:text-[#0D0D0B]">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-sm text-[#8A8A80] hover:text-[#0D0D0B]">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-[#E0DDD7] pt-6 text-center">
            <p className="text-xs text-[#8A8A80]">
              Made with love in Jamaica &middot; &copy; 2026 Jobsy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
