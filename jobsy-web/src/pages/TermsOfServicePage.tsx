import { ScrollText } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-green-800 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollText className="h-10 w-10 text-gold mx-auto mb-3" />
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-white/70 text-sm">Last updated: March 15, 2026</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 prose-sm">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                By accessing or using the Jobsy platform ("Service"), you agree to be bound by these
                Terms of Service ("Terms"). If you do not agree to all of these Terms, you may not
                access or use the Service. These Terms apply to all visitors, users, service providers,
                and others who access or use the platform.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Jobsy is a service marketplace platform that connects customers with service providers
                across Jamaica. Jobsy acts as an intermediary platform and is not a party to the
                agreements between service providers and customers. We do not employ, recommend, or
                endorse any particular service provider and are not responsible for the quality,
                safety, or legality of services offered.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Account Registration</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                To use certain features of the Service, you must register for an account. When you
                register, you agree to:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorised use of your account</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                You must be at least 18 years old to create an account and use the Service.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. User Roles</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Jobsy supports two primary user roles:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Customers:</strong> Individuals seeking services from providers on the platform</li>
                <li><strong>Providers:</strong> Individuals or businesses offering services through the platform</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Users may hold both roles simultaneously. Providers are responsible for accurately
                representing their qualifications, experience, and pricing.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Service Bookings and Transactions</h2>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>All bookings and agreements are made directly between customers and providers</li>
                <li>Jobsy facilitates payment processing but is not responsible for the fulfillment of services</li>
                <li>Prices listed by providers are in Jamaican Dollars (JMD) unless otherwise stated</li>
                <li>Providers must honour quoted prices and agreed-upon service terms</li>
                <li>Cancellation policies are set by individual providers and must be clearly communicated</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Payments</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Jobsy processes payments through secure third-party payment providers. By using our
                payment features, you agree to:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Pay all fees and charges incurred through your account</li>
                <li>Provide valid payment information</li>
                <li>Authorise Jobsy to charge your selected payment method</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Jobsy may charge a service fee on transactions processed through the platform.
                All fees will be clearly disclosed before any transaction is confirmed. Providers
                receive payouts according to our standard payout schedule, minus applicable
                platform fees.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Reviews and Ratings</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Users may leave reviews and ratings for services received or provided. All reviews
                must be honest, fair, and based on genuine experiences. Jobsy reserves the right to
                remove reviews that contain offensive content, personal attacks, spam, or are
                determined to be fraudulent. Users must not offer incentives in exchange for positive
                reviews or retaliate against users who leave negative reviews.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Prohibited Conduct</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Use the Service for any unlawful purpose or in violation of Jamaican law</li>
                <li>Impersonate any person or entity, or falsely state your qualifications</li>
                <li>Harass, abuse, or threaten other users</li>
                <li>Post false, misleading, or deceptive content</li>
                <li>Manipulate ratings, reviews, or search results</li>
                <li>Use automated means to access the Service without our permission</li>
                <li>Circumvent the platform to avoid paying applicable fees</li>
                <li>Share your account credentials with others</li>
                <li>Engage in any activity that interferes with or disrupts the Service</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Intellectual Property</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                The Jobsy platform, including its design, logos, text, graphics, and software, is
                owned by Jobsy and is protected by intellectual property laws. You may not copy,
                modify, distribute, or create derivative works based on any part of the platform
                without our express written consent. Content you post on the platform remains yours,
                but you grant Jobsy a non-exclusive, royalty-free licence to use, display, and
                distribute such content in connection with the Service.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Limitation of Liability</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                To the fullest extent permitted by law, Jobsy shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages arising out of or in connection
                with your use of the Service. Jobsy is not responsible for the conduct of any user,
                the quality of services provided by service providers, or any disputes between users.
                Our total liability for any claims arising from the use of the Service shall not exceed
                the amount you paid to Jobsy in the twelve months preceding the claim.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Dispute Resolution</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                In the event of a dispute between users, Jobsy may offer mediation services at its
                discretion but is not obligated to resolve disputes. Any disputes between you and
                Jobsy shall be resolved through good-faith negotiation. If a resolution cannot be
                reached, disputes shall be submitted to binding arbitration in accordance with the
                laws of Jamaica. The arbitration shall be conducted in Kingston, Jamaica.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">12. Account Termination</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                You may delete your account at any time through your account settings. Jobsy reserves
                the right to suspend or terminate your account at any time for violations of these
                Terms, fraudulent activity, or behaviour that is harmful to other users or the
                platform. Upon termination, your right to use the Service ceases immediately, though
                certain provisions of these Terms will survive termination.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">13. Changes to Terms</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We may update these Terms from time to time. We will notify you of any material
                changes by posting the updated Terms on this page and updating the "Last updated"
                date. Your continued use of the Service after changes are posted constitutes
                acceptance of the revised Terms. We encourage you to review these Terms periodically.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">14. Governing Law</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of Jamaica,
                without regard to its conflict of law provisions. Any legal action or proceeding
                arising under these Terms shall be brought exclusively in the courts located in
                Kingston, Jamaica.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">15. Contact Us</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="font-medium text-gray-900">Jobsy</p>
                <p>Email: support@jobsyja.com</p>
                <p>Phone: +1 (876) 555-JOBS</p>
                <p>Kingston, Jamaica</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
