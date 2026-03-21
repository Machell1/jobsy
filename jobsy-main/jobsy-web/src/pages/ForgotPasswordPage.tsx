import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { apiPost, ApiError } from '../lib/api'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import PhoneInput from '../components/ui/PhoneInput'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone || phone.length < 11) {
      toast({ title: 'Please enter your phone number', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      await apiPost('/auth/forgot-password', { phone })
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

  const fullPhoneForLink = phone

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
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                />

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
