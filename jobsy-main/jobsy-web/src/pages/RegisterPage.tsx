import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ApiError } from '../lib/api'
import { Eye, EyeOff, Lock, Mail, User, Loader2, Building2, GraduationCap, Check } from 'lucide-react'
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

const passwordChecks = (password: string) => [
  { label: '8+ characters', met: password.length >= 8 },
  { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
  { label: 'Lowercase letter', met: /[a-z]/.test(password) },
  { label: 'Number', met: /\d/.test(password) },
  { label: 'Special character (!@#$%...)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(password) },
]

const isPasswordValid = (password: string) => passwordChecks(password).every(c => c.met)

export default function RegisterPage() {
  const { register, loginWithOAuth, isLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    display_name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer' as 'customer' | 'provider' | 'advertiser',
    account_type: 'individual' as 'individual' | 'organization' | 'school',
    org_name: '',
    org_registration_number: '',
    org_type: '' as '' | 'business' | 'NGO' | 'school' | 'government',
    org_representative_name: '',
    org_representative_title: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.display_name.trim()) {
      toast({ title: 'Please enter your name', variant: 'destructive' })
      return
    }
    if (!form.phone.trim()) {
      toast({ title: 'Please enter your phone number', variant: 'destructive' })
      return
    }
    if (!form.password) {
      toast({ title: 'Please enter a password', variant: 'destructive' })
      return
    }
    if (!isPasswordValid(form.password)) {
      toast({ title: 'Password does not meet all requirements', variant: 'destructive' })
      return
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (form.account_type !== 'individual' && !form.org_name.trim()) {
      toast({ title: 'Organization name is required', variant: 'destructive' })
      return
    }

    try {
      await register({
        display_name: form.display_name.trim(),
        phone: form.phone,
        email: form.email.trim() || undefined,
        password: form.password,
        role: form.role,
        account_type: form.account_type,
        ...(form.account_type !== 'individual' && {
          org_name: form.org_name.trim(),
          org_registration_number: form.org_registration_number.trim() || undefined,
          org_type: form.org_type || undefined,
          org_representative_name: form.org_representative_name.trim() || undefined,
          org_representative_title: form.org_representative_title.trim() || undefined,
        }),
      })
      toast({ title: 'Account created successfully!' })
      navigate('/dashboard', { replace: true })
    } catch (error: unknown) {
      let message = 'Registration failed. Please try again.'

      if (error instanceof ApiError) {
        message = error.detail || message
      } else if (error instanceof Error) {
        message = error.message
      }

      toast({
        title: 'Registration Failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleOAuthRegister = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider)
    try {
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
        await loginWithOAuth('google', idToken, form.role)
      } else {
        toast({ title: 'Apple Sign In', description: 'Apple sign-in is available on Safari / Apple devices', variant: 'destructive' })
        return
      }
      toast({ title: 'Account created successfully!' })
      navigate('/dashboard', { replace: true })
    } catch (error: unknown) {
      let message = 'Sign up failed. Please try again.'
      if (error instanceof ApiError) {
        message = error.detail || message
      } else if (error instanceof Error) {
        message = error.message
      }
      toast({ title: 'Sign Up Failed', description: message, variant: 'destructive' })
    } finally {
      setOauthLoading(null)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-500 mt-1">Join Jamaica's premier service marketplace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Account Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'individual', label: 'Individual', Icon: User },
                  { value: 'organization', label: 'Organization', Icon: Building2 },
                  { value: 'school', label: 'School', Icon: GraduationCap },
                ] as const).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField('account_type', value)}
                    className={`py-3 px-2 rounded-lg border text-sm font-medium transition flex flex-col items-center gap-1 ${
                      form.account_type === value
                        ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Organization / School Fields */}
            {form.account_type !== 'individual' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700">
                  {form.account_type === 'school' ? 'School' : 'Organization'} Details
                </p>

                {/* Org Name (required) */}
                <div>
                  <label htmlFor="org_name" className="block text-sm font-medium text-gray-700 mb-1">
                    {form.account_type === 'school' ? 'School' : 'Organization'} Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="org_name"
                      type="text"
                      value={form.org_name}
                      onChange={e => updateField('org_name', e.target.value)}
                      placeholder={form.account_type === 'school' ? 'School name' : 'Organization name'}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                    />
                  </div>
                </div>

                {/* Registration Number */}
                <div>
                  <label htmlFor="org_registration_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="org_registration_number"
                    type="text"
                    value={form.org_registration_number}
                    onChange={e => updateField('org_registration_number', e.target.value)}
                    placeholder="e.g. TRN or registration #"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  />
                </div>

                {/* Org Type */}
                <div>
                  <label htmlFor="org_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-gray-400">(optional)</span>
                  </label>
                  <select
                    id="org_type"
                    value={form.org_type}
                    onChange={e => updateField('org_type', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-white"
                  >
                    <option value="">Select type...</option>
                    <option value="business">Business</option>
                    <option value="NGO">NGO</option>
                    <option value="school">School</option>
                    <option value="government">Government</option>
                  </select>
                </div>

                {/* Representative Name */}
                <div>
                  <label htmlFor="org_representative_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Representative Name <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="org_representative_name"
                    type="text"
                    value={form.org_representative_name}
                    onChange={e => updateField('org_representative_name', e.target.value)}
                    placeholder="Contact person's name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  />
                </div>

                {/* Representative Title */}
                <div>
                  <label htmlFor="org_representative_title" className="block text-sm font-medium text-gray-700 mb-1">
                    Representative Title <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="org_representative_title"
                    type="text"
                    value={form.org_representative_title}
                    onChange={e => updateField('org_representative_title', e.target.value)}
                    placeholder="e.g. Principal, Manager"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  />
                </div>
              </div>
            )}

            {/* Display Name */}
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="display_name"
                  type="text"
                  value={form.display_name}
                  onChange={e => updateField('display_name', e.target.value)}
                  placeholder="Your full name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Phone */}
            <PhoneInput
              value={form.phone}
              onChange={(v) => updateField('phone', v)}
            />

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                I want to
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('role', 'customer')}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition ${
                    form.role === 'customer'
                      ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Hire services
                </button>
                <button
                  type="button"
                  onClick={() => updateField('role', 'provider')}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition ${
                    form.role === 'provider'
                      ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Offer services
                </button>
                <button
                  type="button"
                  onClick={() => updateField('role', 'advertiser')}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition ${
                    form.role === 'advertiser'
                      ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Advertise
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => updateField('password', e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {form.password && (
                <div className="mt-2 space-y-1">
                  {passwordChecks(form.password).map(check => (
                    <div key={check.label} className="flex items-center gap-1.5">
                      <Check className={`h-3.5 w-3.5 ${check.met ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-xs ${check.met ? 'text-green-600' : 'text-gray-400'}`}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || (!!form.password && !isPasswordValid(form.password))}
              className="w-full bg-primary hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
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
              onClick={() => handleOAuthRegister('google')}
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
              {oauthLoading === 'google' ? 'Signing up...' : 'Continue with Google'}
            </button>

            <button
              type="button"
              onClick={() => handleOAuthRegister('apple')}
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
              {oauthLoading === 'apple' ? 'Signing up...' : 'Continue with Apple'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-green-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
