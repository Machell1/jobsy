import { Link } from 'react-router-dom'
import { MapPin, Mail, Phone } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#059669] rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <span className="text-white font-bold text-lg">Jobsy</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Jamaica's trusted marketplace for local service professionals.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/search" className="text-gray-400 hover:text-white transition">Find Services</Link></li>
              <li><Link to="/job-board" className="text-gray-400 hover:text-white transition">Job Board</Link></li>
              <li><Link to="/noticeboard" className="text-gray-400 hover:text-white transition">Noticeboard</Link></li>
              <li><Link to="/events" className="text-gray-400 hover:text-white transition">Pan di Ends</Link></li>
              <li><Link to="/referrals" className="text-gray-400 hover:text-white transition">Refer &amp; Earn</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/about" className="text-gray-400 hover:text-white transition">About Us</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition">Contact</Link></li>
              <li><Link to="/business" className="text-gray-400 hover:text-white transition">For Businesses</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/terms-of-service" className="text-gray-400 hover:text-white transition">Terms of Service</Link></li>
              <li><Link to="/privacy-policy" className="text-gray-400 hover:text-white transition">Privacy Policy</Link></li>
              <li><Link to="/refund-policy" className="text-gray-400 hover:text-white transition">Refund Policy</Link></li>
              <li><Link to="/community-guidelines" className="text-gray-400 hover:text-white transition">Community Guidelines</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <h4 className="text-white font-semibold text-sm mb-4">Support</h4>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <a href="mailto:support@jobsyja.com" className="hover:text-white transition">support@jobsyja.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <a href="tel:+18765555627" className="hover:text-white transition">+1 (876) 555-JOBS</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>&copy; {year} Jobsy Jamaica Ltd. All rights reserved.</p>
          <p>Made with care in Jamaica</p>
        </div>
      </div>
    </footer>
  )
}
