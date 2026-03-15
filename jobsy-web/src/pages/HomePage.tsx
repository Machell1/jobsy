import { useState } from 'react'
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
  CalendarCheck,
  Star,
  ArrowRight,
  MapPin,
} from 'lucide-react'

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

const steps = [
  {
    icon: ClipboardList,
    title: 'Search',
    description: 'Browse service providers across every parish in Jamaica. Filter by category, location, and ratings.',
  },
  {
    icon: CalendarCheck,
    title: 'Book',
    description: 'Request a booking with your chosen provider. Agree on the scope, timing, and price.',
  },
  {
    icon: Star,
    title: 'Review',
    description: 'After the job is done, leave a review to help the community find the best providers.',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleCategoryClick = (category: string) => {
    navigate(`/search?q=${encodeURIComponent(category)}`)
  }

  return (
    <div className="-mx-4 -mt-6">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-green-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin className="h-8 w-8 text-gold" />
            <span className="text-gold font-semibold text-lg">Jobsy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Jamaica's Premier Service Marketplace
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Find trusted service providers across every parish. From plumbing to beauty,
            connect with skilled professionals in your community.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="What service are you looking for?"
                className="w-full pl-12 pr-28 py-4 rounded-xl text-gray-900 bg-white shadow-lg text-base focus:outline-none focus:ring-4 focus:ring-gold/30"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Popular Categories
          </h2>
          <p className="text-gray-600">
            Browse our most requested service categories
          </p>
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
      </section>

      {/* How It Works */}
      <section className="bg-gray-100 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              How It Works
            </h2>
            <p className="text-gray-600">
              Getting started with Jobsy is easy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={step.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white mb-4 relative">
                  <step.icon className="h-7 w-7" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary to-green-800 rounded-2xl p-10 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 mb-6 max-w-lg mx-auto">
            Join thousands of Jamaicans already using Jobsy to find and offer services.
            Sign up today and connect with your community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-gold text-primary-dark font-semibold px-6 py-3 rounded-lg hover:bg-yellow-400 transition"
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg transition font-medium"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
