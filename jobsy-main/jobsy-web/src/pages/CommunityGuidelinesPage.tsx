import { Users } from 'lucide-react'

export default function CommunityGuidelinesPage() {
  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-green-800 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Users className="h-10 w-10 text-gold mx-auto mb-3" />
          <h1 className="text-4xl font-bold mb-2">Community Guidelines</h1>
          <p className="text-white/70 text-sm">Last updated: March 15, 2026</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 prose-sm">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Jobsy is built on trust, respect, and professionalism. These Community Guidelines
                establish the standards of behaviour expected from all users of the platform,
                including customers, service providers, event organisers, and advertisers. By using
                Jobsy, you agree to abide by these guidelines. Violations may result in warnings,
                suspension, or permanent removal from the platform.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Acceptable Behaviour Standards</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                All Jobsy users are expected to:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Treat all users with respect, courtesy, and professionalism</li>
                <li>Communicate honestly and transparently in all interactions</li>
                <li>Honour commitments, including bookings, scheduled services, and agreed-upon prices</li>
                <li>Respond to messages and booking requests in a timely manner</li>
                <li>Maintain accurate and up-to-date profile and listing information</li>
                <li>Respect the intellectual property and privacy of other users</li>
                <li>Comply with all applicable laws of Jamaica</li>
                <li>Use the platform only for its intended purposes</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Content Standards</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Content posted on Jobsy must not include:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Illegal content:</strong> Anything that violates Jamaican law, including offers for illegal services or products</li>
                <li><strong>Misleading content:</strong> False claims about qualifications, experience, pricing, or service capabilities</li>
                <li><strong>Harmful content:</strong> Content that promotes violence, self-harm, or dangerous activities</li>
                <li><strong>Discriminatory content:</strong> Content that discriminates based on race, ethnicity, gender, religion, sexual orientation, disability, or any other protected characteristic</li>
                <li><strong>Explicit or adult content:</strong> Sexually explicit material, nudity, or adult services</li>
                <li><strong>Spam or promotional abuse:</strong> Repetitive, irrelevant, or unsolicited promotional messages</li>
                <li><strong>Personal information:</strong> Sharing another person's private information without their consent</li>
                <li><strong>Malware or phishing:</strong> Links or attachments designed to harm users or steal information</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Review Guidelines</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Reviews and ratings are essential to trust on Jobsy. All reviews must:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Be honest:</strong> Based on a genuine experience with the service provider or customer</li>
                <li><strong>Be relevant:</strong> Focus on the quality and experience of the service received</li>
                <li><strong>Be fair:</strong> Provide balanced and constructive feedback</li>
                <li><strong>Be respectful:</strong> Avoid personal attacks, profanity, or threatening language</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-3">
                The following review practices are strictly prohibited:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Fake reviews (positive or negative) by anyone who did not receive or provide the service</li>
                <li>Offering or accepting payment, discounts, or incentives in exchange for reviews</li>
                <li>Retaliating against users who leave negative reviews</li>
                <li>Using multiple accounts to leave reviews on the same listing</li>
                <li>Pressuring or threatening users to change or remove reviews</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Communication Standards</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                When communicating through Jobsy's messaging system:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Use professional and respectful language at all times</li>
                <li>Do not use offensive, threatening, or harassing language</li>
                <li>Do not send unsolicited messages for purposes unrelated to services on the platform</li>
                <li>Do not attempt to solicit business outside the Jobsy platform to avoid fees</li>
                <li>Do not share contact information (phone numbers, email addresses) to circumvent the platform</li>
                <li>Respond to booking-related messages within a reasonable timeframe</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Service Provider Standards</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Service providers on Jobsy must:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Accurately represent their skills, qualifications, and experience</li>
                <li>Provide services as described in their listings</li>
                <li>Maintain any required licences, permits, or certifications for their trade</li>
                <li>Arrive on time for scheduled appointments or communicate delays promptly</li>
                <li>Set fair and transparent pricing</li>
                <li>Carry appropriate insurance where applicable</li>
                <li>Complete work to a professional standard</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Consequences for Violations</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Jobsy takes violations of these guidelines seriously. Depending on the severity
                and frequency of violations, consequences may include:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>First offence (minor):</strong> Written warning and education about the relevant guideline</li>
                <li><strong>Second offence or moderate violation:</strong> Temporary suspension of account (7-30 days) and removal of offending content</li>
                <li><strong>Severe violation:</strong> Immediate temporary suspension pending investigation</li>
                <li><strong>Repeated or egregious violations:</strong> Permanent ban from the platform</li>
                <li><strong>Fraudulent activity:</strong> Immediate account termination, forfeiture of pending payouts, and referral to law enforcement where appropriate</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Jobsy reserves the right to take any action it deems necessary to protect the
                safety and integrity of the platform and its users, including actions not listed
                above. Decisions regarding enforcement are made at Jobsy's sole discretion.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Reporting Violations</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                If you encounter behaviour or content that violates these guidelines, please
                report it using one of the following methods:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>In-app reporting:</strong> Use the "Report" button available on profiles, listings, reviews, and messages</li>
                <li><strong>Email:</strong> Send a detailed report to support@jobsyja.com with relevant screenshots or evidence</li>
                <li><strong>Phone:</strong> Call +1 (876) 555-JOBS during business hours</li>
              </ol>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                All reports are reviewed by our Trust &amp; Safety team. We aim to review reports
                within 24-48 hours. Reports are treated confidentially, and reporters are protected
                from retaliation.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Appeals</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If you believe an enforcement action was made in error, you may appeal by emailing
                support@jobsyja.com within 14 days of the action. Include your account details,
                the action taken, and your reasons for the appeal. Appeals are reviewed by a senior
                member of our Trust &amp; Safety team, and decisions on appeals are final.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to These Guidelines</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We may update these Community Guidelines from time to time. We will notify users
                of material changes through the platform or via email. Your continued use of
                Jobsy after changes are posted constitutes acceptance of the updated guidelines.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If you have questions about these Community Guidelines, please contact us at:
              </p>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="font-medium text-gray-900">Jobsy Trust &amp; Safety Team</p>
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
