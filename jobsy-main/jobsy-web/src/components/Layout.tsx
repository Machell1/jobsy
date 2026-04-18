import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiGet, apiPost } from '../lib/api'
import {
  Search, Home, Calendar, MessageSquare, Bell, User, Settings, LogOut,
  Menu, X, Briefcase, Heart, Star, MapPin, CreditCard, Megaphone, Music,
  ChevronDown, Check, Gift, Sparkles, ShieldCheck,
} from 'lucide-react'
import Footer from './Footer'

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
    <span
      className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none"
      aria-label={`${count} unread`}
    >
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const roleDropdownRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const { notifCount, msgCount } = useUnreadCounts(token, isAuthenticated)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close dropdowns/mobile menu on ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setRoleDropdownOpen(false)
        setUserMenuOpen(false)
        setMobileMenu(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenu(false)
    setUserMenuOpen(false)
    setRoleDropdownOpen(false)
  }, [location.pathname])

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
        { to: '/assistant', icon: Sparkles, label: 'Assistant' },
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

  // Homepage should be full-bleed (no max-w container / padding)
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-white focus:text-gray-900 focus:px-3 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-[100] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2"
        >
          <Check className="h-4 w-4 text-green-400" aria-hidden="true" />
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="text-xl font-bold tracking-tight flex items-center gap-2 shrink-0" aria-label="Jobsy home">
            <MapPin className="h-6 w-6 text-gold" aria-hidden="true" />
            Jobsy
          </Link>

          {/* Search bar (authenticated, desktop) */}
          {isAuthenticated && (
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4" role="search">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <label htmlFor="header-search" className="sr-only">Search services</label>
                <input
                  id="header-search"
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search services..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-gold/50 text-sm"
                />
              </div>
            </form>
          )}

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {!isAuthenticated ? (
              <>
                <Link to="/about" className="px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition">About</Link>
                <Link to="/contact" className="px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition">Contact</Link>
                <Link to="/events" className="px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition">Events</Link>
                <Link to="/login" className="ml-1 px-4 py-2 rounded-lg text-sm bg-gold text-primary-dark font-semibold hover:bg-gold-dark transition">
                  Sign In
                </Link>
                <Link to="/register" className="px-4 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 transition font-medium">
                  Register
                </Link>
              </>
            ) : (
              <>
                {/* Role Switcher */}
                {(user?.roles ?? roles ?? []).length > 1 && (
                  <div className="relative" ref={roleDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setRoleDropdownOpen(v => !v)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition text-sm"
                      aria-haspopup="menu"
                      aria-expanded={roleDropdownOpen}
                      aria-label="Switch role"
                    >
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${currentRoleColour}`}>
                        {ROLE_LABELS[activeRole || 'customer'] || activeRole}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>

                    {roleDropdownOpen && (
                      <div role="menu" className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                        <div className="px-3 py-1.5 text-xs text-gray-400 font-medium uppercase tracking-wider">Switch Role</div>
                        {availableRoles.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500">No other roles available</div>
                        ) : availableRoles.map((role: string) => (
                          <button
                            key={role}
                            role="menuitem"
                            onClick={() => handleRoleSwitch(role)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                          >
                            <span className={`w-2 h-2 rounded-full ${ROLE_COLOURS[role]?.split(' ')[0] || 'bg-gray-400'}`} aria-hidden="true" />
                            {ROLE_LABELS[role] || role}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!user?.is_verified && (
                  <Link
                    to="/verify"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 transition text-amber-100"
                    title="Verify Your Account"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-semibold hidden lg:inline">Verify</span>
                  </Link>
                )}

                {/* Notifications with badge */}
                <Link
                  to="/notifications"
                  className="p-2 rounded-lg hover:bg-white/10 transition relative"
                  aria-label={`Notifications${notifCount > 0 ? ` (${notifCount} unread)` : ''}`}
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  <CountBadge count={notifCount} />
                </Link>

                {/* Messages with badge */}
                <Link
                  to="/messages"
                  className="p-2 rounded-lg hover:bg-white/10 transition relative"
                  aria-label={`Messages${msgCount > 0 ? ` (${msgCount} unread)` : ''}`}
                >
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />
                  <CountBadge count={msgCount} />
                </Link>

                {/* User menu dropdown — consolidates Profile / Settings / Admin / Logout */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    aria-label="Account menu"
                  >
                    <User className="h-5 w-5" aria-hidden="true" />
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>

                  {userMenuOpen && (
                    <div role="menu" className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 text-gray-700">
                      {user?.email && (
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-xs text-gray-400">Signed in as</p>
                          <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                        </div>
                      )}
                      <Link to="/profile" role="menuitem" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition">
                        <User className="h-4 w-4" aria-hidden="true" /> Profile
                      </Link>
                      <Link to="/settings" role="menuitem" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition">
                        <Settings className="h-4 w-4" aria-hidden="true" /> Settings
                      </Link>
                      <Link to="/payments" role="menuitem" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition">
                        <CreditCard className="h-4 w-4" aria-hidden="true" /> Payments
                      </Link>
                      <Link to="/reviews" role="menuitem" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition">
                        <Star className="h-4 w-4" aria-hidden="true" /> Reviews
                      </Link>
                      <Link to="/referrals" role="menuitem" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition">
                        <Gift className="h-4 w-4" aria-hidden="true" /> Refer &amp; Earn
                      </Link>
                      {user?.roles?.includes('admin') && (
                        <Link to="/admin" role="menuitem" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition border-t border-gray-100">
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Admin
                        </Link>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setUserMenuOpen(false); logout(); navigate('/login') }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition border-t border-gray-100 text-red-600"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenu(v => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label={mobileMenu ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenu}
            aria-controls="mobile-menu"
          >
            {mobileMenu ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div id="mobile-menu" className="md:hidden border-t border-white/20 px-4 py-3 space-y-1">
            {isAuthenticated && (
              <form onSubmit={handleSearch} className="mb-3" role="search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                  <label htmlFor="mobile-search" className="sr-only">Search services</label>
                  <input
                    id="mobile-search"
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search services..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
              </form>
            )}
            {!isAuthenticated ? (
              <>
                <Link to="/about" className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10">About</Link>
                <Link to="/contact" className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10">Contact</Link>
                <Link to="/events" className="block px-3 py-2 rounded-lg text-sm hover:bg-white/10">Events</Link>
                <div className="pt-2 border-t border-white/20 mt-2 space-y-1">
                  <Link to="/login" className="block px-3 py-2 rounded-lg text-sm bg-gold text-primary-dark font-semibold text-center">Sign In</Link>
                  <Link to="/register" className="block px-3 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-center">Register</Link>
                </div>
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
                          type="button"
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

                <div className="text-[11px] uppercase tracking-wider text-white/40 px-3 pt-2">Navigate</div>
                {navLinks.map(l => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive(l.to) ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  >
                    <l.icon className="h-4 w-4" aria-hidden="true" />
                    {l.label}
                    {l.to === '/messages' && msgCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {msgCount > 99 ? '99+' : msgCount}
                      </span>
                    )}
                  </Link>
                ))}
                {!user?.is_verified && (
                  <Link
                    to="/verify"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-amber-400/20 text-amber-100 hover:bg-amber-400/30"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verify Account
                  </Link>
                )}

                <div className="text-[11px] uppercase tracking-wider text-white/40 px-3 pt-3">Account</div>
                <Link to="/notifications" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <Bell className="h-4 w-4" aria-hidden="true" /> Notifications
                  {notifCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {notifCount > 99 ? '99+' : notifCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <User className="h-4 w-4" aria-hidden="true" /> Profile
                </Link>
                <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <Settings className="h-4 w-4" aria-hidden="true" /> Settings
                </Link>
                <Link to="/payments" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <CreditCard className="h-4 w-4" aria-hidden="true" /> Payments
                </Link>
                <Link to="/reviews" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <Star className="h-4 w-4" aria-hidden="true" /> Reviews
                </Link>
                <Link to="/referrals" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                  <Gift className="h-4 w-4" aria-hidden="true" /> Refer &amp; Earn
                </Link>
                {user?.roles?.includes('admin') && (
                  <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => { logout(); navigate('/login') }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10 w-full text-left text-red-200"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Sign Out
                </button>
              </>
            )}
          </div>
        )}

        {/* Desktop nav tabs */}
        {isAuthenticated && (
          <div className="hidden md:block border-t border-white/20">
            <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto" role="navigation" aria-label="Sections">
              {navLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  aria-current={isActive(l.to) ? 'page' : undefined}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    isActive(l.to)
                      ? 'border-gold text-gold'
                      : 'border-transparent text-white/80 hover:text-white hover:border-white/40'
                  }`}
                >
                  <l.icon className="h-4 w-4" aria-hidden="true" />
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main
        id="main-content"
        tabIndex={-1}
        className={isHome ? 'flex-1' : 'flex-1 w-full max-w-7xl mx-auto px-4 py-6'}
      >
        {children}
      </main>

      <Footer />
    </div>
  )
}
