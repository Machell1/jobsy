import { Link } from 'react-router-dom'
import {
  MapPin,
  Heart,
  Shield,
  Users,
  Zap,
  Globe,
  Star,
  ArrowRight,
} from 'lucide-react'

const values = [
  {
    icon: Heart,
    title: 'Community First',
    description:
      'We believe in empowering local communities by connecting people with skilled service providers right in their parish.',
  },
  {
    icon: Shield,
    title: 'Trust & Safety',
    description:
      'Every provider on Jobsy is vetted and reviewed. We prioritise your safety with secure payments and verified profiles.',
  },
  {
    icon: Zap,
    title: 'Accessibility',
    description:
      'Finding and booking services should be easy for everyone. Our platform is designed to be simple, fast, and reliable.',
  },
  {
    icon: Globe,
    title: 'Island-Wide Reach',
    description:
      'From Kingston to Montego Bay, Portland to Westmoreland -- Jobsy connects service providers and customers across all 14 parishes.',
  },
]

const teamMembers = [
  { name: 'Operations Team', role: 'Customer Success & Support', initial: 'O' },
  { name: 'Engineering Team', role: 'Platform Development', initial: 'E' },
  { name: 'Growth Team', role: 'Community & Marketing', initial: 'G' },
]

export default function AboutPage() {
  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-green-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin className="h-8 w-8 text-gold" />
            <span className="text-gold font-semibold text-lg">Jobsy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About Jobsy</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            Jamaica's premier service marketplace connecting customers with skilled
            service providers across every parish.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Jobsy was built with a simple mission: to make it easier for Jamaicans to find
              reliable, skilled service providers in their community. Whether you need a
              plumber in Portmore, an electrician in Mandeville, or a caterer in Ocho Rios,
              Jobsy connects you with trusted professionals quickly and safely.
            </p>
            <p className="text-gray-600 leading-relaxed">
              For service providers, Jobsy is the platform to grow your business, reach new
              customers, and build a reputation based on quality work and honest reviews.
              We are creating a vibrant marketplace where talent meets opportunity.
            </p>
          </div>
          <div className="bg-gradient-to-br from-primary/5 to-green-50 rounded-2xl p-8 border border-primary/10">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">14</p>
                  <p className="text-sm text-gray-500">Parishes Served</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Star className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">50+</p>
                  <p className="text-sm text-gray-500">Service Categories</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Heart className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">Growing</p>
                  <p className="text-sm text-gray-500">Community of Providers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Values</h2>
            <p className="text-gray-500">The principles that guide everything we do</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map(v => (
              <div key={v.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <v.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Team</h2>
          <p className="text-gray-500">
            Dedicated to building the best service marketplace for Jamaica
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {teamMembers.map(member => (
            <div key={member.name} className="text-center bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-green-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">{member.initial}</span>
              </div>
              <h3 className="font-semibold text-gray-900">{member.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary to-green-800 rounded-2xl p-10 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Join the Jobsy Community</h2>
          <p className="text-white/80 mb-6 max-w-lg mx-auto">
            Whether you are looking for services or offering them, Jobsy is the place
            to connect with your community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-gold text-primary-dark font-semibold px-6 py-3 rounded-lg hover:bg-yellow-400 transition"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg transition font-medium"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
