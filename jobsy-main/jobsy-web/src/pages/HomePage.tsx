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

const categories = [
  { name: 'Plumbing', icon: Wrench, color: 'bg-blue-100 text-blue-700' },
  { name: 'Electrical', icon: Zap, color: 'bg-yellow-100 text-yellow-700' },
  { name: 'Cleaning', icon: Sparkles, color: 'bg-teal-100 text-teal-700' },
  { name: 'Beauty', icon: Scissors, color: 'bg-pink-100 text-pink-700' },
  { name: 'Carpentry', icon: Hammer, color: 'bg-orange-100 text-orange-700' },
  { name: 'Painting', icon: Paintbrush, color: 'bg-purple-100 text-purple-700' },
  { name: 'Landscaping', icon: TreePine, color: 'bg-green-100 text-green-700' },
  { name: 'Auto Repair', icon: Car, color: 'bg-red-100 text-red-700' },
]

const parishes = [
  'All Parishes', 'Kingston', 'St. Andrew', 'St. Catherine', 'Clarendon',
  'Manchester', 'St. Elizabeth', 'Westmoreland', 'Hanover', 'St. James',
  'Trelawny', 'St. Ann', 'St. Mary', 'Portland', 'St. Thomas',
]

const steps = [
  {
    icon: ClipboardList,
    title: 'Post a Job',
    description: 'Describe what you need done. Set your budget and timeline so providers can find you.',
  },
  {
    icon: MessageSquareText,
    title: 'Get Bids',
    description: 'Qualified providers send proposals. Compare ratings, reviews, and prices.',
  },
  {
    icon: CreditCard,
    title: 'Hire & Pay',
    description: 'Choose your provider and pay securely through the platform when the job is complete.',
  },
]

const featuredServices = [
  {
    id: '1',
    title: 'Professional Home Cleaning',
    provider: 'Sparkle Clean JA',
    parish: 'Kingston',
    rating: 4.9,
    reviews: 127,
    price: '$5,000',
    category: 'Cleaning',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=250&fit=crop',
  },
  {
    id: '2',
    title: 'Electrical Wiring & Repair',
    provider: 'PowerFix Solutions',
    parish: 'St. Andrew',
    rating: 4.8,
    reviews: 89,
    price: '$8,000',
    category: 'Electrical',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=250&fit=crop',
  },
  {
    id: '3',
    title: 'Garden & Lawn Care',
    provider: 'GreenThumb Jamaica',
    parish: 'St. Catherine',
    rating: 4.7,
    reviews: 64,
    price: '$4,500',
    category: 'Landscaping',
    image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400&h=250&fit=crop',
  },
  {
    id: '4',
    title: 'Plumbing Installation',
    provider: 'FlowRight Plumbing',
    parish: 'Montego Bay',
    rating: 4.9,
    reviews: 112,
    price: '$7,000',
    category: 'Plumbing',
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=250&fit=crop',
  },
]

const upcomingEvents = [
  {
    id: '1',
    title: 'Reggae Sumfest Warm-Up',
    date: 'Apr 12, 2026',
    location: 'Montego Bay',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop',
  },
  {
    id: '2',
    title: 'Kingston Food Festival',
    date: 'Apr 18, 2026',
    location: 'Kingston',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=200&fit=crop',
  },
  {
    id: '3',
    title: 'Ocho Rios Jazz Fest',
    date: 'May 2, 2026',
    location: 'Ocho Rios',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=200&fit=crop',
  },
]

const testimonials = [
  {
    name: 'Keisha Brown',
    role: 'Homeowner, Kingston',
    text: 'Jobsy made it so easy to find a reliable electrician. The whole process from posting to payment was smooth. I will definitely use it again!',
    rating: 5,
  },
  {
    name: 'Marcus Thompson',
    role: 'Plumber, St. Andrew',
    text: 'As a service provider, Jobsy has brought me steady work. The platform connects me with real customers in my area every week.',
    rating: 5,
  },
  {
    name: 'Tanya Williams',
    role: 'Small Business Owner',
    text: 'I found a great carpenter through Jobsy to renovate my shop. Fair prices and the reviews helped me pick the right person for the job.',
    rating: 5,
  },
]

/* ------------------------------------------------------------------ */
/*  Ad Banner (unchanged)                                              */
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
  const [category, setCategory] = useState('')
  const [parish, setParish] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category) params.set('category', category)
    if (parish && parish !== 'All Parishes') params.set('parish', parish)
    navigate(`/search?${params.toString()}`)
  }

  const handleCategoryClick = (cat: string) => {
    navigate(`/search?q=${encodeURIComponent(cat)}`)
  }

  // JSON-LD structured data for Organization + WebSite
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://jobsyja.com/#organization',
        name: 'Jobsy',
        url: 'https://jobsyja.com',
        logo: 'https://jobsyja.com/logo.png',
        description:
          "Jamaica's premier service marketplace connecting customers with trusted local professionals.",
        sameAs: [
          'https://www.instagram.com/jobsyja',
          'https://www.facebook.com/jobsyja',
          'https://twitter.com/jobsyja',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'support@jobsyja.com',
          contactType: 'customer service',
          areaServed: 'JM',
          availableLanguage: 'English',
        },
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
        description="Find trusted service providers across Jamaica. From home repairs to beauty services, Jobsy connects you with skilled professionals in every parish."
        url="https://jobsyja.com"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-primary to-green-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin className="h-8 w-8 text-gold" />
            <span className="text-gold font-semibold text-lg">Jobsy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Jamaica's Premier Service Marketplace
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Find trusted service providers across every parish. From plumbing to beauty,
            connect with skilled professionals in your community.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-2 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="What service are you looking for?"
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 border border-gray-200"
                />
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="px-3 py-3 rounded-lg text-gray-700 bg-gray-50 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                value={parish}
                onChange={e => setParish(e.target.value)}
                className="px-3 py-3 rounded-lg text-gray-700 bg-gray-50 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {parishes.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-primary hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium text-sm transition shrink-0"
              >
                Search
              </button>
            </div>
          </form>
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
            <p className="text-gray-600">Top-rated providers ready to help</p>
          </div>
          <Link
            to="/search"
            className="hidden sm:inline-flex items-center gap-1 text-primary font-medium text-sm hover:underline"
          >
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredServices.map(svc => (
            <Card key={svc.id} hover>
              <img
                src={svc.image}
                alt={svc.title}
                className="w-full h-40 object-cover rounded-t-xl"
              />
              <CardContent className="space-y-2">
                <Badge variant="success">{svc.category}</Badge>
                <h3 className="font-semibold text-gray-900 leading-snug">{svc.title}</h3>
                <p className="text-sm text-gray-500">{svc.provider}</p>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5" />
                  {svc.parish}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 text-gold fill-gold" />
                    <span className="font-medium">{svc.rating}</span>
                    <span className="text-gray-400">({svc.reviews})</span>
                  </div>
                  <span className="text-primary font-semibold text-sm">From {svc.price}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="sm:hidden text-center mt-6">
          <Link to="/search" className="text-primary font-medium text-sm hover:underline inline-flex items-center gap-1">
            View all services <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  POPULAR CATEGORIES                                          */}
      {/* ============================================================ */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Popular Categories</h2>
            <p className="text-gray-600">Browse our most requested service categories</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-primary/30 transition group"
              >
                <div className={`p-3 rounded-lg ${cat.color} group-hover:scale-110 transition-transform`}>
                  <cat.icon className="h-6 w-6" />
                </div>
                <span className="font-medium text-gray-800 text-sm">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                */}
      {/* ============================================================ */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">How It Works</h2>
            <p className="text-gray-600">Three simple steps to get any job done</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={step.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white mb-4 relative">
                  <step.icon className="h-7 w-7" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gold text-primary-dark text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>
                {idx < steps.length - 1 && (
                  <ArrowRight className="hidden md:block h-5 w-5 text-gray-300 mx-auto mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PAN DI ENDS PREVIEW                                         */}
      {/* ============================================================ */}
      <section className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Music className="h-5 w-5 text-gold" />
                <h2 className="text-2xl md:text-3xl font-bold">Pan di Ends</h2>
              </div>
              <p className="text-gray-400">Upcoming events across Jamaica</p>
            </div>
            <Link
              to="/events"
              className="hidden sm:inline-flex items-center gap-1 text-gold font-medium text-sm hover:underline"
            >
              View all events <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {upcomingEvents.map(event => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="group rounded-xl overflow-hidden bg-gray-800 hover:bg-gray-750 transition"
              >
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-white group-hover:text-gold transition">{event.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {event.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="sm:hidden text-center mt-6">
            <Link to="/events" className="text-gold font-medium text-sm hover:underline inline-flex items-center gap-1">
              View all events <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS                                                */}
      {/* ============================================================ */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">What Our Community Says</h2>
            <p className="text-gray-600">Real feedback from Jamaicans using Jobsy every day</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <Card key={idx} className="relative">
                <CardContent className="pt-8">
                  <Quote className="absolute top-4 left-5 h-6 w-6 text-primary/15" />
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-gold fill-gold" />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                  <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                    <Avatar name={t.name} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA                                                         */}
      {/* ============================================================ */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary to-green-800 rounded-2xl p-10 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to Get Started?</h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">
            Join thousands of Jamaicans already using Jobsy to find and offer services.
            Sign up today and connect with your community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register">
              <Button variant="secondary" size="lg">
                Sign Up
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/job-board">
              <Button variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white">
                Post a Job
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
