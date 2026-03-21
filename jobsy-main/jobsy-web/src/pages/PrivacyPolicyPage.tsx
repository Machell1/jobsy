import { Shield } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-green-800 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="h-10 w-10 text-gold mx-auto mb-3" />
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-white/70 text-sm">Last updated: March 15, 2026</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 prose-sm">
          <div className="space-y-8">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-2">
              <p className="text-sm text-green-800 leading-relaxed">
                This Privacy Policy is governed by the <strong>Data Protection Act, 2020 of Jamaica</strong>.
                We are committed to protecting your personal data in accordance with this Act and
                all applicable data protection regulations.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Jobsy ("we", "our", or "us") operates the Jobsy service marketplace platform.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your
                information when you use our platform in accordance with the Data Protection Act, 2020
                of Jamaica. By accessing or using Jobsy, you agree to this Privacy Policy. If you do
                not agree, please do not use the platform.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We collect information you provide directly, including:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Account information: name, phone number, email address, password</li>
                <li>Profile information: bio, profile photo, service categories, location (parish)</li>
                <li>Business information: business name, address, category</li>
                <li>Transaction data: payment amounts, payment methods, transaction history</li>
                <li>Communication data: messages, reviews, and feedback</li>
                <li>Usage data: browsing activity, search queries, device information</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>To provide, maintain, and improve our platform and services</li>
                <li>To process transactions and send related information</li>
                <li>To connect service providers with customers</li>
                <li>To verify user identities and prevent fraud</li>
                <li>To send notifications about bookings, messages, and account activity</li>
                <li>To personalise your experience and provide relevant recommendations</li>
                <li>To respond to customer service requests and support needs</li>
                <li>To send marketing and promotional communications (with your consent)</li>
                <li>To comply with legal obligations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Information Sharing</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Service connections:</strong> When you book a service or accept a job, relevant information is shared between parties</li>
                <li><strong>Payment processors:</strong> Transaction data is shared with our payment partners to process payments securely</li>
                <li><strong>Legal requirements:</strong> When required by law, regulation, or legal process</li>
                <li><strong>Safety:</strong> To protect the rights, property, or safety of Jobsy, our users, or others</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                We do not sell your personal information to third parties.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Storage and Retention</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Your personal data is stored on secure servers. We retain your information for as long
                as your account is active or as needed to provide our services, comply with legal
                obligations, resolve disputes, and enforce our agreements:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Account data:</strong> Retained for the duration of your account and up to 2 years after deletion</li>
                <li><strong>Transaction records:</strong> Retained for 7 years in accordance with Jamaican tax and financial regulations</li>
                <li><strong>Communication data:</strong> Retained for 1 year after the associated booking or transaction is completed</li>
                <li><strong>Usage and analytics data:</strong> Retained in anonymised form for up to 3 years</li>
                <li><strong>Legal and compliance data:</strong> Retained as required by applicable law</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                When data is no longer required, it is securely deleted or anonymised in accordance
                with the Data Protection Act, 2020 of Jamaica.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Security</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We implement appropriate technical and organisational security measures to protect
                your personal information as required under the Data Protection Act, 2020. This
                includes encryption of data in transit and at rest, secure authentication, access
                controls, and regular security assessments. However, no method of electronic storage
                or transmission is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Your Rights Under the Data Protection Act</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Under the Data Protection Act, 2020 of Jamaica, you have the following rights
                regarding your personal data:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Right of access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Right to erasure:</strong> Request deletion of your personal data, subject to legal retention requirements</li>
                <li><strong>Right to restrict processing:</strong> Request that we limit how we use your data</li>
                <li><strong>Right to data portability:</strong> Receive your data in a structured, commonly used format</li>
                <li><strong>Right to object:</strong> Object to processing of your personal data for direct marketing</li>
                <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time where processing is based on consent</li>
                <li>Opt out of marketing communications at any time</li>
                <li>Control notification preferences through your account settings</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                To exercise any of these rights, contact us at support@jobsyja.com. We will respond
                to your request within 30 days. You also have the right to lodge a complaint with
                the Office of the Information Commissioner of Jamaica.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Cookies and Tracking</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We use cookies and similar technologies to maintain your session, remember
                preferences, and analyse platform usage. You can control cookie settings through
                your browser preferences.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Children's Privacy</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Jobsy is not intended for individuals under the age of 18. We do not knowingly
                collect personal information from children. If we become aware that a child has
                provided us with personal information, we will take steps to delete such data.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any
                material changes by posting the new policy on this page and updating the "Last
                updated" date. We encourage you to review this policy periodically.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Governing Law</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                This Privacy Policy is governed by the Data Protection Act, 2020 of Jamaica and the
                laws of Jamaica. Any disputes arising from this policy shall be subject to the
                exclusive jurisdiction of the courts of Jamaica. For data protection enquiries, you
                may also contact the Office of the Information Commissioner of Jamaica.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">12. Contact Us</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at:
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
