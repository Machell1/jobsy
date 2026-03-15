import { useState } from 'react'
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Clock,
  CheckCircle,
  MessageSquare,
} from 'lucide-react'

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-green-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <MessageSquare className="h-10 w-10 text-gold mx-auto mb-3" />
          <h1 className="text-4xl font-bold mb-3">Contact Us</h1>
          <p className="text-lg text-white/80 max-w-xl mx-auto">
            Have a question, suggestion, or need help? We would love to hear from you.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <a href="mailto:support@jobsyja.com" className="text-sm text-primary hover:underline">
                    support@jobsyja.com
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Phone</p>
                  <a href="tel:+18765555627" className="text-sm text-primary hover:underline">
                    +1 (876) 555-JOBS
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Office</p>
                  <p className="text-sm text-gray-600">Kingston, Jamaica</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Hours</p>
                  <p className="text-sm text-gray-600">Mon-Fri: 8AM - 6PM</p>
                  <p className="text-sm text-gray-600">Sat: 9AM - 1PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                    Thank you for reaching out. Our team will get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false)
                      setForm({ name: '', email: '', subject: '', message: '' })
                    }}
                    className="px-4 py-2 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Send us a message</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          required
                          placeholder="Your name"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          required
                          placeholder="you@example.com"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={form.subject}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        required
                        placeholder="What is this about?"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                      <textarea
                        value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        required
                        rows={6}
                        placeholder="Tell us how we can help..."
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      <Send className="h-4 w-4" />
                      Send Message
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
