import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Search, Home, Calendar, MessageSquare, Bell, User, Settings, LogOut,
  Menu, X, Briefcase, Heart, Star, MapPin, CreditCard, Megaphone, Building2, ShieldCheck
} from 'lucide-react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, activeRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenu, setMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const isActive = (path: string) => location.pathname === path

  const navLinks = isAuthenticated
    ? [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/search', icon: Search, label: 'Search' },
        { to: '/bookings', icon: Calendar, label: 'Bookings' },
        { to: '/job-board', icon: Briefcase, label: 'Jobs' },
        { to: '/discover', icon: Heart, label: 'Discover' },
        { to: '/messages', icon: MessageSquare, label: 'Messages' },
        { to: '/noticeboard', icon: Megaphone, label: 'Noticeboard' },
      ]
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="text-xl font-bold tracking-tight flex items-center gap-2 shrink-0">
            <MapPin className="h-6 w-6 text-gold" />
            Jobsy
          </Link>

          {/* Search bar */}
          {isAuthenticated && (
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search services..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-gold/50 text-sm"
                />
              </div>
            </form>
          )}

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {!isAuthenticated ? (
              <>
                <Link to="/about" className="px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition">About</Link>
                <Link to="/contact" className="px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition">Contact</Link>
                <Link to="/login" className="px-4 py-2 rounded-lg text-sm bg-gold text-primary-dark font-medium hover:bg-gold-dark transition">
                  Sign In
                </Link>
                <Link to="/register" className="px-4 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 transition">
                  Register
                </Link>
              </>
            ) : (
              <>
                <Link to="/notifications" className="p-2 rounded-lg hover:bg-white/10 transition">
                  <Bell className="h-5 w-5" />
                </Link>
                <Link to="/profile" className="p-2 rounded-lg hover:bg-white/10 transition">
                  <User className="h-5 w-5" />
                </Link>
                <Link to="/settings" className="p-2 rounded-lg hover:bg-white/10 transition">
                  <Settings className="h-5 w-5" />
                </Link>
                <button onClick={() => { logout(); navigate('/login') }} className="p-2 rounded-lg hover:bg-white/10 transition">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
          >
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden border-t border-white/20 px-4 py-3 space-y-1">
            {isAuthenticated && (
              <form onSubmit={handleSearch} className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search services..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 text-sm"
                  />
                </div>
              </form>
            )}
            {!isAuthenticated ? (
              <>
                <Link to="/about" onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10">About</Link>
                <Link to="/contact" onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10">Contact</Link>
                <Link to="/login" onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10">Sign In</Link>
                <Link to="/register" onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10">Register</Link>
              </>
            ) : (
              <>
                {navLinks.map(l => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileMenu(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive(l.to) ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  >
                    <l.icon className="h-4 w-4" />
                    {l.label}
                  </Link>
                ))}
                <hr className="border-white/20 my-2" />
                <Link to="/profile" onClick={() => setMobileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <User className="h-4 w-4" /> Profile
                </Link>
                <Link to="/settings" onClick={() => setMobileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <Link to="/payments" onClick={() => setMobileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <CreditCard className="h-4 w-4" /> Payments
                </Link>
                <Link to="/reviews" onClick={() => setMobileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <Star className="h-4 w-4" /> Reviews
                </Link>
                <button
                  onClick={() => { logout(); navigate('/login'); setMobileMenu(false) }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10 w-full text-left"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </>
            )}
          </div>
        )}

        {/* Desktop nav tabs */}
        {isAuthenticated && (
          <div className="hidden md:block border-t border-white/20">
            <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
              {navLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    isActive(l.to)
                      ? 'border-gold text-gold'
                      : 'border-transparent text-white/80 hover:text-white hover:border-white/40'
                  }`}
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-gold" />
                Jobsy
              </h3>
              <p className="text-sm">Jamaica's premier service marketplace connecting customers with skilled providers.</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Platform</h4>
              <div className="space-y-2 text-sm">
                <Link to="/search" className="block hover:text-white transition">Find Services</Link>
                <Link to="/job-board" className="block hover:text-white transition">Job Board</Link>
                <Link to="/noticeboard" className="block hover:text-white transition">Noticeboard</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Company</h4>
              <div className="space-y-2 text-sm">
                <Link to="/about" className="block hover:text-white transition">About Us</Link>
                <Link to="/contact" className="block hover:text-white transition">Contact</Link>
                <Link to="/privacy-policy" className="block hover:text-white transition">Privacy Policy</Link>
                <Link to="/terms-of-service" className="block hover:text-white transition">Terms of Service</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Support</h4>
              <div className="space-y-2 text-sm">
                <p>Email: support@jobsyja.com</p>
                <p>Phone: +1 (876) 555-JOBS</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-4 text-sm text-center">
            &copy; {new Date().getFullYear()} Jobsy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
