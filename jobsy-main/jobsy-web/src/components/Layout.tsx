import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiGet, apiPost } from '../lib/api'
import {
  Search, Home, Calendar, MessageSquare, Bell, User, Settings, LogOut,
  Menu, X, Briefcase, Heart, Star, MapPin, CreditCard, Megaphone, Building2, ShieldCheck, Music,
  ChevronDown, Check, Gift
} from 'lucide-react'

// ── Role badge colours ──────────────────────────────────────────────────
const ROLE_COLOURS: Record<string, string> = {
  provider:   'bg-green-500 text-white',
  hirer:      'bg-blue-500 text-white',
  advertiser: 'bg-yellow-500 text-gray-900',
  customer:   'bg-purple-500 text-white',
  admin:      'bg-red-500 text-white',
}

const ROLE_LABELS: Record<string, string> = {
  provider:   'Provider',
  hirer:      'Hirer',
  advertiser: 'Advertiser',
  customer:   'Customer',
  admin:      'Admin',
}

// ── Notification count badge ────────────────────────────────────────────
function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ── Hook: poll unread counts every 30s ──────────────────────────────────
function useUnreadCounts(token: string | null, isAuthenticated: boolean) {
  const [notifCount, setNotifCount] = useState(0)
  const [msgCount, setMsgCount] = useState(0)

  const fetchCounts = useCallback(async () => {
    if (!token || !isAuthenticated) return
    try {
      const [notifs, convos] = await Promise.allSettled([
        apiGet('/api/notifications?unread=true', token),
        apiGet('/api/chat/conversations', token),
      ])
      if (notifs.status === 'fulfilled' && notifs.value) {
        const data = notifs.value
        setNotifCount(typeof data.total === 'number' ? data.total : Array.isArray(data) ? data.length : 0)
      }
      if (convos.status === 'fulfilled' && convos.value) {
        const data = convos.value
        const list = Array.isArray(data) ? data : data?.conversations ?? []
        const unread = list.filter((c: Record<string, unknown>) => c.unread_count && (c.unread_count as number) > 0).length
        setMsgCount(unread)
      }
    } catch {
      // silently ignore count fetch errors
    }
  }, [token, isAuthenticated])

  useEffect(() => {
    fetchCounts()
    const id = setInterval(fetchCounts, 30_000)
    return () => clearInterval(id)
  }, [fetchCounts])

  return { notifCount, msgCount }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthenticated, logout, activeRole, setActiveRole, roles } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenu, setMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const roleDropdownRef = useRef<HTMLDivElement>(null)

  const { notifCount, msgCount } = useUnreadCounts(token, isAuthenticated)

  // Close role dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const handleRoleSwitch = async (role: string) => {
    setRoleDropdownOpen(false)
    if (role === activeRole) return
    try {
      await apiPost('/auth/roles/switch', { role }, token)
    } catch {
      // In preview mode or when backend is unavailable, still allow local role switch
    }
    setActiveRole(role)
    sessionStorage.setItem('jobsy_role', role)
    setToast(`Switched to ${ROLE_LABELS[role] || role} role`)
  }

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
        { to: '/events', icon: Music, label: 'Pan di Ends' },
      ]
    : []

  const currentRoleColour = ROLE_COLOURS[activeRole || 'customer'] || ROLE_COLOURS.customer
  const availableRoles = (user?.roles ?? roles ?? []).filter((r: string) => r !== activeRole)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in flex items-center gap-2">
          <Check className="h-4 w-4 text-green-400" />
          {toast}
        </div>
      )}

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
                <Link to="/events" className="px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition">Events</Link>
                <Link to="/login" className="px-4 py-2 rounded-lg text-sm bg-gold text-primary-dark font-medium hover:bg-gold-dark transition">
                  Sign In
                </Link>
                <Link to="/register" className="px-4 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 transition">
                  Register
                </Link>
              </>
            ) : (
              <>
                {/* Role Switcher */}
                {(user?.roles ?? roles ?? []).length > 1 && (
                  <div className="relative" ref={roleDropdownRef}>
                    <button
                      onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition text-sm"
                    >
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${currentRoleColour}`}>
                        {ROLE_LABELS[activeRole || 'customer'] || activeRole}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {roleDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                        <div className="px-3 py-1.5 text-xs text-gray-400 font-medium uppercase tracking-wider">Switch Role</div>
                        {availableRoles.map((role: string) => (
                          <button
                            key={role}
                            onClick={() => handleRoleSwitch(role)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                          >
                            <span className={`w-2 h-2 rounded-full ${ROLE_COLOURS[role]?.split(' ')[0] || 'bg-gray-400'}`} />
                            {ROLE_LABELS[role] || role}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {user?.roles?.includes('admin') && (
                  <Link to="/admin" className="p-2 rounded-lg hover:bg-white/10 transition" title="Admin Dashboard">
                    <ShieldCheck className="h-5 w-5" />
                  </Link>
                )}

                {/* Notifications with badge */}
                <Link to="/notifications" className="p-2 rounded-lg hover:bg-white/10 transition relative">
                  <Bell className="h-5 w-5" />
                  <CountBadge count={notifCount} />
                </Link>

                {/* Messages with badge */}
                <Link to="/messages" className="p-2 rounded-lg hover:bg-white/10 transition relative">
                  <MessageSquare className="h-5 w-5" />
                  <CountBadge count={msgCount} />
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
        <div className={`md:hidden border-t border-white/20 px-4 py-3 space-y-1 ${mobileMenu ? '' : 'hidden'}`} aria-hidden={!mobileMenu}>
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
                <Link to="/events" onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10">Events</Link>
                <Link to="/login" onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10">Sign In</Link>
                <Link to="/register" onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10">Register</Link>
              </>
            ) : (
              <>
                {/* Mobile role switcher */}
                {(user?.roles ?? roles ?? []).length > 1 && (
                  <div className="mb-2 px-3 py-2">
                    <div className="text-xs text-white/60 mb-1.5">Active Role</div>
                    <div className="flex flex-wrap gap-2">
                      {(user?.roles ?? roles ?? []).map((role: string) => (
                        <button
                          key={role}
                          onClick={() => handleRoleSwitch(role)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                            role === activeRole
                              ? ROLE_COLOURS[role] || 'bg-gray-500 text-white'
                              : 'bg-white/10 text-white/80 hover:bg-white/20'
                          }`}
                        >
                          {ROLE_LABELS[role] || role}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {navLinks.map(l => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileMenu(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive(l.to) ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  >
                    <l.icon className="h-4 w-4" />
                    {l.label}
                    {l.to === '/messages' && msgCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {msgCount > 99 ? '99+' : msgCount}
                      </span>
                    )}
                  </Link>
                ))}
                <hr className="border-white/20 my-2" />
                <Link to="/notifications" onClick={() => setMobileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <Bell className="h-4 w-4" /> Notifications
                  {notifCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {notifCount > 99 ? '99+' : notifCount}
                    </span>
                  )}
                </Link>
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
                <Link to="/referrals" onClick={() => setMobileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <Gift className="h-4 w-4" /> Refer &amp; Earn
                </Link>
                {user?.roles?.includes('admin') && (
                  <Link to="/admin" onClick={() => setMobileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                    <ShieldCheck className="h-4 w-4" /> Admin
                  </Link>
                )}
                <button
                  onClick={() => { logout(); navigate('/login'); setMobileMenu(false) }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10 w-full text-left"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </>
            )}
        </div>

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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
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
                <Link to="/events" className="block hover:text-white transition">Pan di Ends</Link>
                <Link to="/referrals" className="block hover:text-white transition">Refer &amp; Earn</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Company</h4>
              <div className="space-y-2 text-sm">
                <Link to="/about" className="block hover:text-white transition">About Us</Link>
                <Link to="/contact" className="block hover:text-white transition">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Legal</h4>
              <div className="space-y-2 text-sm">
                <Link to="/privacy-policy" className="block hover:text-white transition">Privacy Policy</Link>
                <Link to="/terms-of-service" className="block hover:text-white transition">Terms of Service</Link>
                <Link to="/refund-policy" className="block hover:text-white transition">Refund Policy</Link>
                <Link to="/community-guidelines" className="block hover:text-white transition">Community Guidelines</Link>
                <Link to="/advertiser-terms" className="block hover:text-white transition">Advertiser Terms</Link>
                <Link to="/contract-terms" className="block hover:text-white transition">Contract Terms</Link>
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
