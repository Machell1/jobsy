import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { apiPost, apiGet, ApiError } from '../lib/api'

interface User {
  id: string
  phone: string
  display_name?: string
  email?: string
  bio?: string
  active_role?: string
  roles: string[]
  is_verified: boolean
  email_verified: boolean
}

interface AuthContextValue {
  user: User | null
  token: string | null
  refreshToken: string | null
  activeRole: string | null
  roles: string[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: { phone: string; password: string }) => Promise<void>
  loginWithOAuth: (provider: 'google' | 'apple', idToken: string, role?: string) => Promise<void>
  register: (data: Record<string, unknown>) => Promise<void>
  logout: () => void
  setActiveRole: (role: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('jobsy_token'))
  const [refreshToken, setRefreshToken] = useState<string | null>(() => sessionStorage.getItem('jobsy_refresh'))
  const [activeRole, setActiveRole] = useState<string | null>(() => sessionStorage.getItem('jobsy_role'))
  const [roles, setRoles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const saveTokens = useCallback((access: string, refresh: string, role?: string, r?: string[]) => {
    setToken(access)
    setRefreshToken(refresh)
    sessionStorage.setItem('jobsy_token', access)
    sessionStorage.setItem('jobsy_refresh', refresh)
    if (role) {
      setActiveRole(role)
      sessionStorage.setItem('jobsy_role', role)
    }
    if (r) setRoles(r)
  }, [])

  const fetchProfile = useCallback(async (t: string, authData?: Record<string, unknown>, phone?: string) => {
    try {
      const profile = await apiGet('/api/profiles/me', t)
      const merged: User = {
        id: profile?.id || (authData as Record<string, unknown>)?.user_id as string || '',
        phone: phone || profile?.phone || '',
        display_name: profile?.display_name || (authData as Record<string, unknown>)?.display_name as string || undefined,
        email: profile?.email || undefined,
        bio: profile?.bio || undefined,
        active_role: (authData as Record<string, unknown>)?.active_role as string || profile?.active_role || 'customer',
        roles: ((authData as Record<string, unknown>)?.roles as string[]) || profile?.roles || [],
        is_verified: profile?.is_verified || false,
        email_verified: profile?.email_verified || false,
      }
      setUser(merged)
    } catch {
      // profile endpoint may fail, set minimal user
      if (authData) {
        setUser({
          id: (authData as Record<string, unknown>).user_id as string || '',
          phone: phone || '',
          display_name: (authData as Record<string, unknown>).display_name as string || undefined,
          active_role: (authData as Record<string, unknown>).active_role as string || 'customer',
          roles: ((authData as Record<string, unknown>).roles as string[]) || [],
          is_verified: false,
          email_verified: false,
        })
      } else if (sessionStorage.getItem('jobsy_preview_mode') !== 'true') {
        setToken(null)
        setUser(null)
      }
    }
  }, [])

  const login = useCallback(async (data: { phone: string; password: string }) => {
    setIsLoading(true)
    try {
      const res = await apiPost('/auth/login', data)
      saveTokens(res.access_token, res.refresh_token, res.active_role, res.roles || [])
      await fetchProfile(res.access_token, res, data.phone)
    } finally {
      setIsLoading(false)
    }
  }, [saveTokens, fetchProfile])

  const loginWithOAuth = useCallback(async (provider: 'google' | 'apple', idToken: string, role = 'customer') => {
    setIsLoading(true)
    try {
      const res = await apiPost('/auth/oauth', { provider, id_token: idToken, role })
      saveTokens(res.access_token, res.refresh_token, res.active_role, res.roles || [])
      await fetchProfile(res.access_token, res)
    } finally {
      setIsLoading(false)
    }
  }, [saveTokens, fetchProfile])

  const register = useCallback(async (data: Record<string, unknown>) => {
    setIsLoading(true)
    try {
      const res = await apiPost('/auth/register', data)
      saveTokens(res.access_token, res.refresh_token, res.active_role, res.roles || [])
      await fetchProfile(res.access_token, res)
    } finally {
      setIsLoading(false)
    }
  }, [saveTokens, fetchProfile])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    setRefreshToken(null)
    setActiveRole(null)
    setRoles([])
    sessionStorage.removeItem('jobsy_token')
    sessionStorage.removeItem('jobsy_refresh')
    sessionStorage.removeItem('jobsy_role')
  }, [])

  // Auto-refresh token
  useEffect(() => {
    if (!token || !refreshToken) return
    const interval = setInterval(async () => {
      try {
        const res = await apiPost('/auth/refresh', { refresh_token: refreshToken })
        saveTokens(res.access_token, res.refresh_token)
      } catch {
        logout()
      }
    }, 840_000) // 14 minutes
    return () => clearInterval(interval)
  }, [token, refreshToken, saveTokens, logout])

  // Restore session on mount — preview mode if no backend
  useEffect(() => {
    if (token && !user) {
      fetchProfile(token).catch(() => {
        // If profile fetch fails (no backend), check for preview mode
        if (sessionStorage.getItem('jobsy_preview_mode') === 'true') {
          setUser({
            id: '7a235c64-197f-4a35-aa7f-f09574b56969',
            phone: '+18761234567',
            display_name: 'Machell Williams',
            email: 'admin@jobsyja.com',
            bio: 'Platform admin & service provider',
            active_role: sessionStorage.getItem('jobsy_role') || 'provider',
            roles: ['hirer', 'provider', 'advertiser', 'admin'],
            is_verified: true,
            email_verified: true,
          })
        }
      })
    }
    // Enable preview mode if no token exists and preview flag is set
    if (!token && sessionStorage.getItem('jobsy_preview_mode') === 'true') {
      const previewToken = 'preview_mode_token'
      setToken(previewToken)
      sessionStorage.setItem('jobsy_token', previewToken)
      sessionStorage.setItem('jobsy_refresh', previewToken)
      setActiveRole('provider')
      setRoles(['hirer', 'provider', 'advertiser', 'admin'])
      setUser({
        id: '7a235c64-197f-4a35-aa7f-f09574b56969',
        phone: '+18761234567',
        display_name: 'Machell Williams',
        email: 'admin@jobsyja.com',
        bio: 'Platform admin & service provider',
        active_role: 'provider',
        roles: ['hirer', 'provider', 'advertiser', 'admin'],
        is_verified: true,
        email_verified: true,
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        activeRole,
        roles,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        loginWithOAuth,
        register,
        logout,
        setActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
