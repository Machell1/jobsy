import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Wrench,
  Zap,
  Sparkles,
  Scissors,
  Hammer,
  Paintbrush,
  TreePine,
  Car,
  ClipboardList,
  MessageSquareText,
  CreditCard,
  Star,
  ArrowRight,
  MapPin,
  ExternalLink,
  Music,
  Calendar,
  ChevronRight,
  Quote,
  Truck,
  GraduationCap,
  Camera,
  UtensilsCrossed,
  Wrench as RepairIcon,
  Cpu,
  PawPrint,
  Dumbbell,
  PartyPopper,
  Building2,
  Shirt,
  HelpCircle,
  CheckCircle2,
  UserCheck,
  Loader2,
} from 'lucide-react'
import { API_BASE } from '../lib/api'
import SEO from '../components/SEO'
import Button from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const ALL_CATEGORIES = [
  { name: 'Home Cleaning', slug: 'home-cleaning', icon: Sparkles, color: 'bg-teal-100 text-teal-700' },
  { name: 'Plumbing', slug: 'plumbing', icon: Wrench, color: 'bg-blue-100 text-blue-700' },
  { name: 'Electrical', slug: 'electrical', icon: Zap, color: 'bg-yellow-100 text-yellow-700' },
  { name: 'Landscaping', slug: 'landscaping', icon: TreePine, color: 'bg-green-100 text-green-700' },
  { name: 'Painting', slug: 'painting', icon: Paintbrush, color: 'bg-purple-100 text-purple-700' },
  { name: 'Moving', slug: 'moving', icon: Truck, color: 'bg-indigo-100 text-indigo-700' },
  { name: 'Tutoring', slug: 'tutoring', icon: GraduationCap, color: 'bg-sky-100 text-sky-700' },
  { name: 'Photography', slug: 'photography', icon: Camera, color: 'bg-rose-100 text-rose-700' },
  { name: 'Catering', slug: 'catering', icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-700' },
  { name: 'Beauty & Hair', slug: 'beauty-hair', icon: Scissors, color: 'bg-pink-100 text-pink-700' },
  { name: 'Auto Repair', slug: 'auto-repair', icon: Car, color: 'bg-red-100 text-red-700' },
  { name: 'Tech Support', slug: 'tech-support', icon: Cpu, color: 'bg-cyan-100 text-cyan-700' },
  { name: 'Pet Care', slug: 'pet-care', icon: PawPrint, color: 'bg-amber-100 text-amber-700' },
  { name: 'Fitness Training', slug: 'fitness-training', icon: Dumbbell, color: 'bg-lime-100 text-lime-700' },
  { name: 'Event Planning', slug: 'event-planning', icon: PartyPopper, color: 'bg-fuchsia-100 text-fuchsia-700' },
  { name: 'Construction', slug: 'construction', icon: Building2, color: 'bg-stone-100 text-stone-700' },
  { name: 'Tailoring', slug: 'tailoring', icon: Shirt, color: 'bg-violet-100 text-violet-700' },
  { name: 'Other', slug: 'other', icon: HelpCircle, color: 'bg-gray-100 text-gray-700' },
]

const PARISHES = [
  'All Parishes', 'Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon',
  'Manchester', 'St. Elizabeth', 'Westmoreland', 'Hanover', 'St. James',
  'Trelawny', 'St. Ann', 'St. Mary', 'Portland', 'St. Thomas',
]

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: 'Search',
    description: 'Browse or search for the service you need. Filter by parish, category, and price.',
    step: '1',
  },
  {
    icon: MessageSquareText,
    title: 'Book',
    description: 'Contact the provider directly, agree on details, and confirm your booking.',
    step: '2',
  },
  {
    icon: CheckCircle2,
    title: 'Done',
    description: 'Get the job done and pay securely. Leave a review to help the community.',
    step: '3',
  },
]

const TESTIMONIALS = [
  {
    name: 'Keisha Brown',
    role: 'Homeowner, Kingston',
    text: 'Jobsy made it so easy to find a reliable electrician. The whole process from posting to payment was smooth.',
    rating: 5,
  },
  {
    name: 'Marcus Thompson',
    role: 'Plumber, St. Andrew',
    text: 'As a service provider, Jobsy has brought me steady work every week. Best platform for local professionals.',
    rating: 5,
  },
  {
    name: 'Tanya Williams',
    role: 'Small Business Owner',
    text: 'I found a great carpenter through Jobsy to renovate my shop. Fair prices and the reviews helped me pick the right person.',
    rating: 5,
  },
]

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FeaturedService {
  id: string
  title: string
  description: string
  priceMin: number
  priceMax?: number
  priceCurrency: string
  parish: string
  isFeatured: boolean
  category?: { name: string; slug: string }
  provider?: { id: string; name: string; avatarUrl?: string }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatJMD(amount: number): string {
  return `J$${amount.toLocaleString('en-JM')}`
}

function getCategoryGradient(slug?: string): string {
  const gradients: Record<string, string> = {
    plumbing: 'from-blue-400 to-blue-600',
    electrical: 'from-yellow-400 to-orange-500',
    'home-cleaning': 'from-teal-400 to-cyan-600',
    landscaping: 'from-green-400 to-emerald-600',
    painting: 'from-purple-400 to-violet-600',
    'beauty-hair': 'from-pink-400 to-rose-600',
    construction: 'from-stone-400 to-stone-600',
    'auto-repair': 'from-red-400 to-red-600',
    catering: 'from-orange-400 to-amber-600',
    photography: 'from-indigo-400 to-blue-600',
    'pet-care': 'from-amber-400 to-yellow-600',
    'fitness-training': 'from-lime-400 to-green-600',
    'event-planning': 'from-fuchsia-400 to-pink-600',
    tutoring: 'from-sky-400 to-blue-600',
    moving: 'from-indigo-400 to-purple-600',
    'tech-support': 'from-cyan-400 to-blue-600',
    tailoring: 'from-violet-400 to-purple-600',
  }
  return gradients[slug ?? ''] ?? 'from-emerald-400 to-green-600'
}

/* ------------------------------------------------------------------ */
/*  Featured Service Card Skeleton                                     */
/* ------------------------------------------------------------------ */

function ServiceCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-5 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="flex justify-between pt-2 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Ad Banner                                                          */
/* ------------------------------------------------------------------ */

interface ServedAd {
  id: string
  name: string
  creative_url: string | null
  creative_type: string
  click_url: string | null
  ad_type: string
}

function AdBanner() {
  const [ad, setAd] = useState<ServedAd | null>(null)
  const impressionTracked = useRef(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/ads/serve/home_banner`)
      .then(r => r.json())
      .then(data => {
        if (data.ad) {
          setAd(data.ad)
          if (!impressionTracked.current) {
            impressionTracked.current = true
          }
        }
      })
      .catch(() => {})
  }, [])

  if (!ad || !ad.creative_url) return null

  const handleClick = () => {
    fetch(`${API_BASE}/api/ads/click/${ad.id}`, { method: 'POST' }).catch(() => {})
    if (ad.click_url) {
      window.open(ad.click_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
        <span className="absolute top-2 left-2 bg-gray-800/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded z-10">
          Sponsored
        </span>
        <button onClick={handleClick} className="w-full block cursor-pointer">
          {ad.creative_type === 'video' ? (
            <video src={ad.creative_url} autoPlay muted loop playsInline className="w-full h-24 sm:h-32 object-cover" />
          ) : (
            <img src={ad.creative_url} alt={ad.name} className="w-full h-24 sm:h-32 object-cover" />
          )}
        </button>
        {ad.click_url && (
          <div className="absolute bottom-2 right-2">
            <ExternalLink className="h-3.5 w-3.5 text-white drop-shadow" />
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Home Page                                                          */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [parish, setParish] = useState('')
  const [featuredServices, setFeaturedServices] = useState<FeaturedService[]>([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)

  // Fetch featured services from API
  useEffect(() => {
    setLoadingFeatured(true)
    fetch(`${API_BASE}/api/services?featured=true&limit=4`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const items = Array.isArray(data) ? data : (data?.services ?? data?.data ?? [])
        setFeaturedServices(items.slice(0, 4))
      })
      .catch(() => setFeaturedServices([]))
      .finally(() => setLoadingFeatured(false))
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (parish && parish !== 'All Parishes') params.set('parish', parish)
    navigate(`/search?${params.toString()}`)
  }

  const handleCategoryClick = (slug: string, name: string) => {
    navigate(`/search?q=${encodeURIComponent(name)}`)
  }

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://jobsyja.com/#organization',
        name: 'Jobsy',
        url: 'https://jobsyja.com',
        logo: 'https://jobsyja.com/logo.png',
        description: "Jamaica's premier service marketplace connecting customers with trusted local professionals.",
        sameAs: [
          'https://www.instagram.com/jobsyja',
          'https://www.facebook.com/jobsyja',
          'https://twitter.com/jobsyja',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://jobsyja.com/#website',
        url: 'https://jobsyja.com',
        name: 'Jobsy',
        publisher: { '@id': 'https://jobsyja.com/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://jobsyja.com/#/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }

  return (
    <div className="-mx-4 -mt-6">
      <SEO
        title="Jobsy — Jamaica's Service Marketplace"
        description="Find trusted service providers across Jamaica. From home repairs to personal care — book verified professionals in your parish."
        url="https://jobsyja.com"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-[#059669] to-[#047857] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-6 text-sm font-medium">
            <MapPin className="h-4 w-4 text-[#FCD34D]" />
            <span>Jamaica's #1 Service Marketplace</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
            Find Trusted Service Providers<br className="hidden md:block" />{' '}
            Across Jamaica
          </h1>
          <p className="text-lg md:text-xl text-white/85 mb-10 max-w-2xl mx-auto leading-relaxed">
            From home repairs to personal care — book verified professionals in your parish.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-xl p-2 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="What service are you looking for?"
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 border border-gray-200"
                />
              </div>
              <select
                value={parish}
                onChange={e => setParish(e.target.value)}
                className="px-3 py-3 rounded-lg text-gray-700 bg-gray-50 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                {PARISHES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-[#059669] hover:bg-[#047857] text-white px-7 py-3 rounded-lg font-semibold text-sm transition shrink-0 flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Find Services
              </button>
            </div>
          </form>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-white/75 text-sm">
            <span className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-[#FCD34D]" />
              Verified Providers
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-[#FCD34D] fill-[#FCD34D]" />
              Rated & Reviewed
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-[#FCD34D]" />
              Secure Payments
            </span>
          </div>
        </div>
      </section>

      {/* Sponsored Ad Banner */}
      <AdBanner />

      {/* ============================================================ */}
      {/*  FEATURED SERVICES                                           */}
      {/* ============================================================ */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Featured Services</h2>
            <p className="text-gray-500 text-sm">Top-rated providers ready to help</p>
          </div>
          <Link
            to="/search"
            className="hidden sm:inline-flex items-center gap-1 text-[#059669] font-medium text-sm hover:underline"
          >
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loadingFeatured ? (
            Array.from({ length: 4 }).map((_, i) => <ServiceCardSkeleton key={i} />)
          ) : featuredServices.length > 0 ? (
            featuredServices.map(svc => {
              const catSlug = svc.category?.slug
              const catName = svc.category?.name ?? 'Service'
              const gradient = getCategoryGradient(catSlug)
              return (
                <Link
                  key={svc.id}
                  to={`/search?q=${encodeURIComponent(catName)}&parish=${encodeURIComponent(svc.parish)}`}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition group"
                >
                  {/* Gradient image placeholder */}
                  <div className={`h-40 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <span className="text-white/80 font-semibold text-lg text-center px-4 leading-snug group-hover:text-white transition">
                      {svc.title.length > 30 ? svc.title.substring(0, 28) + '…' : svc.title}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5">
                      {catName}
                    </span>
                    <h3 className="font-semibold text-gray-900 leading-snug text-sm line-clamp-2">{svc.title}</h3>
                    {svc.provider?.name && (
                      <p className="text-xs text-gray-500">{svc.provider.name}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {svc.parish}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">From</span>
                      <span className="text-[#059669] font-bold text-sm">
                        {formatJMD(svc.priceMin)}
                        {svc.priceMax ? ` – ${formatJMD(svc.priceMax)}` : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })
          ) : (
            /* Fallback placeholder cards when API has no data */
            [
              { id: '1', title: 'Expert Plumbing Services', cat: 'Plumbing', catSlug: 'plumbing', parish: 'Manchester', min: 3000, max: 15000, provider: 'Kemar Brown' },
              { id: '2', title: 'Deep Home Cleaning', cat: 'Home Cleaning', catSlug: 'home-cleaning', parish: 'Kingston', min: 4000, max: 10000, provider: 'Shanelle Thompson' },
              { id: '3', title: 'Braiding & Natural Hair Care', cat: 'Beauty & Hair', catSlug: 'beauty-hair', parish: 'Kingston', min: 2500, max: 8000, provider: 'Shanelle Thompson' },
              { id: '4', title: 'Lawn Care & Garden Maintenance', cat: 'Landscaping', catSlug: 'landscaping', parish: 'St. James', min: 3500, max: 12000, provider: 'Devon Mitchell' },
            ].map(svc => (
              <Link
                key={svc.id}
                to={`/search?q=${encodeURIComponent(svc.cat)}`}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition group"
              >
                <div className={`h-40 bg-gradient-to-br ${getCategoryGradient(svc.catSlug)} flex items-center justify-center`}>
                  <span className="text-white/90 font-semibold text-base text-center px-4 leading-snug">
                    {svc.title}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5">
                    {svc.cat}
                  </span>
                  <h3 className="font-semibold text-gray-900 leading-snug text-sm">{svc.title}</h3>
                  <p className="text-xs text-gray-500">{svc.provider}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {svc.parish}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">From</span>
                    <span className="text-[#059669] font-bold text-sm">
                      {formatJMD(svc.min)} – {formatJMD(svc.max)}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="sm:hidden text-center mt-6">
          <Link to="/search" className="text-[#059669] font-medium text-sm hover:underline inline-flex items-center gap-1">
            View all services <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ALL 18 CATEGORIES                                           */}
      {/* ============================================================ */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Browse by Category</h2>
            <p className="text-gray-500 text-sm">18 service categories across every parish in Jamaica</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryClick(cat.slug, cat.name)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-[#059669]/30 transition group cursor-pointer"
              >
                <div className={`p-2.5 rounded-lg ${cat.color} group-hover:scale-110 transition-transform`}>
                  <cat.icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-gray-800 text-xs text-center leading-snug">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                */}
      {/* ============================================================ */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">How It Works</h2>
            <p className="text-gray-500 text-sm">Three simple steps to get any job done</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-[#059669]/20 via-[#059669]/50 to-[#059669]/20" />

            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.title} className="text-center relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#059669] to-[#047857] text-white mb-4 relative shadow-lg shadow-emerald-200">
                  <step.icon className="h-7 w-7" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#D97706] text-white text-xs font-bold flex items-center justify-center shadow">
                    {step.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>
                {idx < HOW_IT_WORKS.length - 1 && (
                  <ArrowRight className="hidden md:block h-5 w-5 text-gray-300 mx-auto mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS                                                */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-gray-50 to-emerald-50/30 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">What Our Community Says</h2>
            <p className="text-gray-500 text-sm">Real feedback from Jamaicans using Jobsy every day</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition relative">
                <Quote className="absolute top-5 left-5 h-6 w-6 text-[#059669]/10" />
                <div className="flex gap-0.5 mb-4 pt-2">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-[#D97706] fill-[#D97706]" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                  <Avatar name={t.name} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA SECTION                                                 */}
      {/* ============================================================ */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-[#059669] to-[#047857] rounded-2xl p-10 text-white text-center shadow-xl shadow-emerald-200">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to Get Started?</h2>
            <p className="text-white/80 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
              Join thousands of Jamaicans already connecting with trusted service providers on Jobsy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/search">
                <button className="bg-white text-[#059669] hover:bg-gray-50 font-semibold px-7 py-3 rounded-lg transition flex items-center gap-2 text-sm shadow">
                  <Search className="h-4 w-4" />
                  Find a Service
                </button>
              </Link>
              <Link to="/register?role=provider">
                <button className="bg-transparent border-2 border-white/60 hover:border-white text-white font-semibold px-7 py-3 rounded-lg transition flex items-center gap-2 text-sm hover:bg-white/10">
                  <ArrowRight className="h-4 w-4" />
                  Become a Provider
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                      */}
      {/* ============================================================ */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-[#059669] rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <span className="text-white font-bold text-lg">Jobsy</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Jamaica's trusted marketplace for local service professionals.
              </p>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Services</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/search?q=Plumbing" className="hover:text-white transition">Plumbing</Link></li>
                <li><Link to="/search?q=Electrical" className="hover:text-white transition">Electrical</Link></li>
                <li><Link to="/search?q=Cleaning" className="hover:text-white transition">Home Cleaning</Link></li>
                <li><Link to="/search?q=Beauty" className="hover:text-white transition">Beauty & Hair</Link></li>
                <li><Link to="/search" className="hover:text-white transition text-[#059669]">All Categories →</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><Link to="/business" className="hover:text-white transition">For Businesses</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link to="/refund-policy" className="hover:text-white transition">Refund Policy</Link></li>
                <li><Link to="/community-guidelines" className="hover:text-white transition">Community Guidelines</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} Jobsy Jamaica Ltd. All rights reserved.</p>
            <p>Made with care in Jamaica 🇯🇲</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
