import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ApiError } from '../lib/api'
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react'
import PhoneInput from '../components/ui/PhoneInput'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
          prompt: (callback: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const { login, loginWithOAuth, isLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: string })?.from || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location.state])

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider)
    try {
      // For Google: use Google Identity Services popup
      if (provider === 'google') {
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
        if (!googleClientId) {
          toast({ title: 'Google sign-in is not configured', variant: 'destructive' })
          return
        }
        const idToken = await new Promise<string>((resolve, reject) => {
          const script = document.getElementById('google-gsi-script') as HTMLScriptElement | null
          const initAndPrompt = () => {
            window.google!.accounts.id.initialize({
              client_id: googleClientId,
              callback: (response: { credential: string }) => {
                resolve(response.credential)
              },
            })
            window.google!.accounts.id.prompt((notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => {
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                reject(new Error('Google sign-in was cancelled'))
              }
            })
          }
          if (script && window.google?.accounts?.id) {
            initAndPrompt()
          } else {
            const s = document.createElement('script')
            s.id = 'google-gsi-script'
            s.src = 'https://accounts.google.com/gsi/client'
            s.onload = initAndPrompt
            s.onerror = () => reject(new Error('Failed to load Google sign-in'))
            document.head.appendChild(s)
          }
        })
        await loginWithOAuth('google', idToken)
      } else {
        // Apple Sign In via redirect (web)
        toast({ title: 'Apple Sign In', description: 'Apple sign-in is available on Safari / Apple devices', variant: 'destructive' })
        return
      }
      toast({ title: 'Welcome back!' })
      const from = (location.state as { from?: string })?.from || '/dashboard'
      navigate(from, { replace: true })
    } catch (error: unknown) {
      let message = 'Sign in failed. Please try again.'
      if (error instanceof ApiError) {
        message = error.detail || message
      } else if (error instanceof Error) {
        message = error.message
      }
      toast({ title: 'Sign In Failed', description: message, variant: 'destructive' })
    } finally {
      setOauthLoading(null)
    }
  }

  if (isAuthenticated) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone || phone.length < 11 || !password) {
      toast({
        title: 'Please enter your phone number and password',
        variant: 'destructive',
      })
      return
    }

    try {
      await login({ phone, password })
      toast({ title: 'Welcome back!' })
      const from = (location.state as { from?: string })?.from || '/dashboard'
      navigate(from, { replace: true })
    } catch (error: unknown) {
      let message = 'An unexpected error occurred. Please try again.'

      if (error instanceof ApiError) {
        const detail = error.detail?.toLowerCase() || ''
        if (detail.includes('invalid credentials') || detail.includes('invalid phone') || detail.includes('invalid password')) {
          message = 'Invalid phone number or password'
        } else {
          message = error.detail || 'Login failed. Please try again.'
        }
      } else if (error instanceof Error) {
        message = error.message
      }

      toast({
        title: 'Login Failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500 mt-1">Sign in to your Jobsy account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone Input */}
            <PhoneInput
              value={phone}
              onChange={setPhone}
              required
            />

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-green-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* OAuth Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="mx-4 text-sm text-gray-400">or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading || oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition text-sm font-medium text-gray-700"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {oauthLoading === 'google' ? 'Signing in...' : 'Continue with Google'}
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin('apple')}
              disabled={isLoading || oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black border border-black rounded-lg hover:bg-gray-900 disabled:opacity-50 transition text-sm font-medium text-white"
            >
              {oauthLoading === 'apple' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="white">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              {oauthLoading === 'apple' ? 'Signing in...' : 'Continue with Apple'}
            </button>
          </div>

          {/* Register Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:text-green-700 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
