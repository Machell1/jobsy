import Link from "next/link";
import type { Metadata } from "next";
import { SERVICE_CATEGORIES } from "@jobsy/config";
import {
  Search,
  MessageSquare,
  ShieldCheck,
  Star,
  MapPin,
  ChevronRight,
  ArrowRight,
  Lock,
} from "lucide-react";
import { CategoryTile } from "../components/CategoryTile";
import { CategoryGradient } from "../components/CategoryGradient";
import { HeroSearchForm } from "./hero-search-form";

export const metadata: Metadata = {
  title: "Jobsy — Jamaica's Premier Service Marketplace",
  description:
    "Find trusted service providers across Jamaica. From home repairs to beauty services, Jobsy connects you with skilled professionals in every parish.",
  openGraph: {
    title: "Jobsy — Jamaica's Premier Service Marketplace",
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

const FEATURED_PROVIDERS = [
  {
    id: "1",
    name: "Sparkle Clean JA",
    title: "Professional Home Cleaning",
    parish: "Kingston",
    rating: 4.9,
    reviews: 127,
    price: "J$5,000",
    category: "Cleaning",
    verified: true,
    responseHours: 1,
    bookedCount: 42,
  },
  {
    id: "2",
    name: "PowerFix Solutions",
    title: "Electrical Wiring & Repair",
    parish: "St. Andrew",
    rating: 4.8,
    reviews: 89,
    price: "J$8,000",
    category: "Electrical",
    verified: true,
    responseHours: 2,
    bookedCount: 31,
  },
  {
    id: "3",
    name: "GreenThumb Jamaica",
    title: "Garden & Lawn Care",
    parish: "St. Catherine",
    rating: 4.7,
    reviews: 64,
    price: "J$4,500",
    category: "Gardening",
    verified: true,
    responseHours: 3,
    bookedCount: 18,
  },
  {
    id: "4",
    name: "FlowRight Plumbing",
    title: "Plumbing Installation",
    parish: "St. James",
    rating: 4.9,
    reviews: 112,
    price: "J$7,000",
    category: "Plumbing",
    verified: true,
    responseHours: 1,
    bookedCount: 56,
  },
];

const STEPS = [
  {
    number: "01",
    title: "Search & Discover",
    description:
      "Browse verified providers by category, parish, or keyword. Read reviews from real Jamaicans.",
    icon: Search,
  },
  {
    number: "02",
    title: "Connect & Discuss",
    description:
      "Message providers directly. Discuss your needs, get quotes, and agree on terms.",
    icon: MessageSquare,
  },
  {
    number: "03",
    title: "Book & Pay Securely",
    description:
      "Pay through Jobsy with escrow protection. Funds release only when you confirm the job is done.",
    icon: ShieldCheck,
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

const AVATAR_COLORS = [
  "bg-[var(--color-navy)]",
  "bg-[var(--color-emerald)]",
  "bg-[var(--color-gold)]",
];

const FOOTER_NAV = {
  Services: [
    { label: "Browse All", href: "/search" },
    { label: "Plumbing", href: "/search?category=Plumbing" },
    { label: "Electrical", href: "/search?category=Electrical" },
    { label: "Cleaning", href: "/search?category=Cleaning" },
    { label: "Beauty", href: "/search?category=Beauty" },
    { label: "View all \u2192", href: "/search" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Become a Provider", href: "/register" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Contact Us", href: "/contact" },
  ],
  Support: [
    { label: "Help Centre", href: "/help" },
    { label: "Safety", href: "/safety" },
    { label: "Community Guidelines", href: "/community-guidelines" },
    { label: "Accessibility", href: "/accessibility" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helper: initials from name                                         */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
}

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
      {/*  HERO — Dark, premium, commanding                            */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-[var(--color-neutral-950)] px-4 py-24 md:py-32">
        {/* Subtle grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Trust badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-emerald)] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-emerald)]" />
            </span>
            <span className="text-sm font-medium text-white/80">
              500+ verified providers across Jamaica
            </span>
          </div>

          {/* Headline */}
          <h1 className="type-display-2xl text-white md:text-[4.5rem]">
            Find Trusted{" "}
            <span className="text-[var(--color-gold-bright)]">Professionals</span>
            <br className="hidden md:block" /> in Every Parish
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
            From plumbing to photography, Jobsy connects you with verified local
            service providers across all 14 parishes. Book with confidence.
          </p>

          {/* Search bar */}
          <div className="mt-10">
            <HeroSearchForm
              categories={SERVICE_CATEGORIES.map((c) => c.label)}
            />
          </div>

          {/* Quick category links */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-white/40">Popular:</span>
            {["Cleaning", "Plumbing", "Electrical", "Beauty"].map((cat) => (
              <Link
                key={cat}
                href={`/search?category=${encodeURIComponent(cat)}`}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white/80"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CATEGORIES                                                  */}
      {/* ============================================================ */}
      <section id="categories" className="bg-[var(--color-warm-white)] px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="type-display-lg text-[var(--color-neutral-950)]">
              Browse by Category
            </h2>
            <p className="mt-3 text-[var(--color-neutral-600)]">
              Explore our most requested service categories across Jamaica
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SERVICE_CATEGORIES.map((cat) => (
              <CategoryTile key={cat.key} category={cat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURED PROVIDERS                                          */}
      {/* ============================================================ */}
      <section className="bg-[var(--color-neutral-100)] px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="type-display-lg text-[var(--color-neutral-950)]">
                Featured Providers
              </h2>
              <p className="mt-3 text-[var(--color-neutral-600)]">
                Top-rated professionals ready to help
              </p>
            </div>
            <Link
              href="/search"
              className="btn-press hidden items-center gap-1 rounded-full bg-[var(--color-navy)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-navy-hover)] sm:inline-flex"
            >
              View all
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_PROVIDERS.map((provider, index) => (
              <Link
                key={provider.id}
                href={`/provider/${provider.id}`}
                className="provider-card card-animate group overflow-hidden rounded-[14px] border border-[var(--color-neutral-200)] bg-[var(--color-warm-white)] shadow-[var(--shadow-sm)]"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Category gradient banner */}
                <div className="relative h-32 overflow-hidden">
                  <div className="cover-image h-full w-full">
                    <CategoryGradient category={provider.category} />
                  </div>
                  {/* Category badge */}
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[var(--color-neutral-800)] shadow-[var(--shadow-xs)] backdrop-blur-sm">
                    {provider.category}
                  </span>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Provider name + verified */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--color-neutral-950)] group-hover:text-[var(--color-navy)]">
                      {provider.name}
                    </h3>
                    {provider.verified && (
                      <span
                        className="inline-flex items-center justify-center rounded-full bg-[var(--color-emerald)] p-0.5 text-white"
                        title="Verified provider"
                      >
                        <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-[var(--color-neutral-600)]">
                    {provider.title}
                  </p>

                  {/* Location */}
                  <div className="mt-3 flex items-center gap-1.5 text-sm text-[var(--color-neutral-400)]">
                    <MapPin className="h-4 w-4" strokeWidth={1.5} />
                    {provider.parish}
                  </div>

                  {/* Rating + Price */}
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--color-neutral-200)] pt-4">
                    <div className="flex items-center gap-1">
                      <Star
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                        strokeWidth={1.5}
                      />
                      <span className="text-sm font-semibold text-[var(--color-neutral-950)]">
                        {provider.rating}
                      </span>
                      <span className="text-sm text-[var(--color-neutral-400)]">
                        ({provider.reviews})
                      </span>
                    </div>
                    <span className="type-price text-sm font-semibold text-[var(--color-navy)]">
                      From {provider.price}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile view-all link */}
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/search"
              className="btn-press inline-flex items-center gap-1 rounded-full bg-[var(--color-navy)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-navy-hover)]"
            >
              View all providers
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                */}
      {/* ============================================================ */}
      <section id="how-it-works" className="bg-[var(--color-warm-white)] px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="type-display-lg text-[var(--color-neutral-950)]">
              How Jobsy Works
            </h2>
            <p className="mt-3 text-[var(--color-neutral-600)]">
              Three simple steps to get any job done
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.number}
                  className="relative rounded-[14px] border border-[var(--color-neutral-200)] bg-[var(--color-warm-white)] p-8 shadow-[var(--shadow-xs)]"
                >
                  {/* Step number */}
                  <span className="font-mono text-xs font-semibold tracking-widest text-[var(--color-neutral-400)]">
                    {step.number}
                  </span>

                  {/* Icon */}
                  <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--color-navy-subtle)]">
                    <StepIcon
                      className="h-6 w-6 text-[var(--color-navy)]"
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* Text */}
                  <h3 className="mt-5 font-display text-lg font-semibold text-[var(--color-neutral-950)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-neutral-600)]">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS                                                */}
      {/* ============================================================ */}
      <section className="bg-[var(--color-neutral-100)] px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="type-display-lg text-[var(--color-neutral-950)]">
              What Our Community Says
            </h2>
            <p className="mt-3 text-[var(--color-neutral-600)]">
              Real feedback from Jamaicans using Jobsy every day
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className="relative rounded-[14px] border border-[var(--color-neutral-200)] bg-[var(--color-warm-white)] p-8"
              >
                {/* Decorative quote mark */}
                <span
                  className="absolute right-6 top-4 font-display text-6xl leading-none text-[var(--color-navy)] opacity-[0.07]"
                  aria-hidden="true"
                >
                  &ldquo;
                </span>

                {/* Stars */}
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <Star
                      key={si}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                      strokeWidth={1.5}
                    />
                  ))}
                </div>

                {/* Quote text */}
                <p className="mb-6 text-sm leading-relaxed text-[var(--color-neutral-600)]">
                  &ldquo;{t.text}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 border-t border-[var(--color-neutral-200)] pt-5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-sm font-bold text-white`}
                    aria-hidden="true"
                  >
                    {getInitials(t.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-neutral-950)]">
                      {t.name}
                    </p>
                    <p className="text-xs text-[var(--color-neutral-400)]">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PROVIDER CTA — Dark with gold accent                        */}
      {/* ============================================================ */}
      <section className="bg-[var(--color-neutral-950)] px-4 py-24">
        <div className="mx-auto max-w-3xl text-center">
          {/* Gold accent bar */}
          <div className="mx-auto mb-8 h-1 w-16 rounded-full bg-[var(--color-gold-bright)]" />

          <h2 className="type-display-lg text-white">
            Ready to Grow Your Business?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/60">
            Join hundreds of skilled Jamaican professionals already earning more
            with Jobsy. Set your own rates. Build your reputation. Get paid
            securely.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="btn-press inline-flex items-center gap-2 rounded-full bg-[var(--color-gold-bright)] px-8 py-3.5 text-sm font-semibold text-[var(--color-neutral-950)] shadow-[var(--shadow-md)] transition-transform hover:brightness-110"
            >
              Become a Provider
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/search"
              className="btn-press rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
            >
              Browse Services
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/40">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              Verified profiles
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-4 w-4" strokeWidth={1.5} />
              Secure payments
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4" strokeWidth={1.5} />
              Real reviews
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                      */}
      {/* ============================================================ */}
      <footer className="border-t border-[var(--color-neutral-100)] bg-white px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
            {/* Column 1 — Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F2556] text-sm font-bold text-white">
                  J
                </span>
                <span className="font-display text-xl font-bold text-[var(--color-navy)]">
                  Jobsy
                </span>
              </Link>
              <p className="mt-4 max-w-[200px] text-sm leading-relaxed text-[var(--color-neutral-400)]">
                Jamaica&apos;s trusted marketplace for local service professionals.
              </p>
            </div>

            {/* Columns 2-4 — Navigation */}
            {Object.entries(FOOTER_NAV).map(([heading, links]) => (
              <div key={heading}>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-neutral-400)]">
                  {heading}
                </h3>
                <ul className="mt-4 space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-[var(--color-neutral-400)] transition-colors hover:text-[var(--color-neutral-950)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-12 border-t border-[var(--color-neutral-100)] pt-8">
            <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
              <p className="text-sm text-[var(--color-neutral-400)]">
                &copy; 2026 Jobsy Jamaica Limited. All rights reserved.
              </p>
              <div className="flex items-center gap-1.5 text-sm text-[var(--color-neutral-400)]">
                <Link href="/privacy" className="transition-colors hover:text-[var(--color-neutral-600)]">
                  Privacy Policy
                </Link>
                <span>&middot;</span>
                <Link href="/terms" className="transition-colors hover:text-[var(--color-neutral-600)]">
                  Terms of Service
                </Link>
                <span>&middot;</span>
                <Link href="/cookies" className="transition-colors hover:text-[var(--color-neutral-600)]">
                  Cookie Policy
                </Link>
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-[var(--color-neutral-400)]">
              Made with <span className="text-[#C8861A]">love</span> in Jamaica 🇯🇲
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
