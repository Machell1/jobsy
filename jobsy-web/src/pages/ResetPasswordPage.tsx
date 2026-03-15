import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { apiPost, ApiError } from '../lib/api'
import { Lock, KeyRound, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const phoneFromUrl = searchParams.get('phone') || ''

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp.trim()) {
      toast({ title: 'Please enter the verification code', variant: 'destructive' })
      return
    }
    if (!newPassword) {
      toast({ title: 'Please enter a new password', variant: 'destructive' })
      return
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      await apiPost('/auth/reset-password', {
        phone: phoneFromUrl,
        otp: otp.trim(),
        new_password: newPassword,
      })
      setSuccess(true)
      toast({ title: 'Password reset successfully!' })
    } catch (error: unknown) {
      let message = 'Failed to reset password. Please try again.'

      if (error instanceof ApiError) {
        message = error.detail || message
      } else if (error instanceof Error) {
        message = error.message
      }

      toast({
        title: 'Reset Failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {!success ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
                <p className="text-gray-500 mt-1">
                  Enter the verification code sent to your phone and set a new password
                </p>
                {phoneFromUrl && (
                  <p className="text-sm text-primary mt-2 font-medium">{phoneFromUrl}</p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* OTP Input */}
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      placeholder="Enter the code"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm tracking-wider text-center font-mono"
                      maxLength={8}
                      autoComplete="one-time-code"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
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
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
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
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-primary mb-4">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
              <p className="text-gray-500 mb-6">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition w-full"
              >
                Go to Sign In
              </button>
            </div>
          )}

          {!success && (
            <div className="mt-6 text-center">
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-green-700 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Request a new code
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
