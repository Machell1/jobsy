import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ApiError } from '../lib/api'
import { Eye, EyeOff, Phone, Lock, Mail, User, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const { register, isLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    display_name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer' as 'customer' | 'provider',
  })
  const [showPassword, setShowPassword] = useState(false)

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
    if (form.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }

    const fullPhone = form.phone.startsWith('+') ? form.phone : `+1876${form.phone.trim()}`

    try {
      await register({
        display_name: form.display_name.trim(),
        phone: fullPhone,
        email: form.email.trim() || undefined,
        password: form.password,
        role: form.role,
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

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-500 mt-1">Join Jamaica's premier service marketplace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">
                  +1876
                </span>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  placeholder="7-digit number"
                  className="w-full pl-[5.5rem] pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  autoComplete="tel"
                />
              </div>
            </div>

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
              <div className="grid grid-cols-2 gap-3">
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
                  placeholder="At least 6 characters"
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
              disabled={isLoading}
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
