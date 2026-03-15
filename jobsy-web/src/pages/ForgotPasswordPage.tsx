import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { apiPost, ApiError } from '../lib/api'
import { Phone, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedPhone = phone.trim()
    if (!trimmedPhone) {
      toast({ title: 'Please enter your phone number', variant: 'destructive' })
      return
    }

    const fullPhone = trimmedPhone.startsWith('+') ? trimmedPhone : `+1876${trimmedPhone}`

    setIsLoading(true)
    try {
      await apiPost('/auth/forgot-password', { phone: fullPhone })
      setSubmitted(true)
      toast({ title: 'OTP sent to your phone' })
    } catch (error: unknown) {
      let message = 'Failed to send reset code. Please try again.'

      if (error instanceof ApiError) {
        message = error.detail || message
      } else if (error instanceof Error) {
        message = error.message
      }

      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fullPhoneForLink = phone.trim().startsWith('+') ? phone.trim() : `+1876${phone.trim()}`

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {!submitted ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
                <p className="text-gray-500 mt-1">
                  Enter your phone number and we'll send you a verification code
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="7-digit number"
                      className="w-full pl-[5.5rem] pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    'Send Reset Code'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-primary mb-4">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Code Sent!</h2>
              <p className="text-gray-500 mb-6">
                We've sent a verification code to your phone. Enter it on the reset page to set a new password.
              </p>
              <Link
                to={`/reset-password?phone=${encodeURIComponent(fullPhoneForLink)}`}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition w-full"
              >
                Enter Reset Code
              </Link>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-green-700 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
