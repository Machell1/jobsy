import { RotateCcw } from 'lucide-react'

export default function RefundPolicyPage() {
  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-green-800 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <RotateCcw className="h-10 w-10 text-gold mx-auto mb-3" />
          <h1 className="text-4xl font-bold mb-2">Refund Policy</h1>
          <p className="text-white/70 text-sm">Last updated: March 15, 2026</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 prose-sm">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Overview</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                This Refund Policy outlines the rules and procedures for requesting refunds on
                the Jobsy platform. Different refund rules apply depending on the type of
                transaction. All amounts referenced in this policy are in Jamaican Dollars (JMD)
                unless otherwise stated. This policy is governed by the laws of Jamaica.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Service Bookings</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Refunds for service bookings are subject to the following rules:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Before service begins:</strong> Full refund if cancelled at least 24 hours before the scheduled service time</li>
                <li><strong>Late cancellation:</strong> 50% refund if cancelled less than 24 hours but more than 2 hours before the service</li>
                <li><strong>No-show by provider:</strong> Full refund issued automatically if the provider does not show up or cancels</li>
                <li><strong>Service not as described:</strong> Full or partial refund if the service delivered materially differs from what was listed, subject to review</li>
                <li><strong>After service completion:</strong> Refund requests must be submitted within 48 hours of service completion</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Individual providers may set stricter cancellation policies, which will be
                displayed on their service listing. The provider's policy applies where it offers
                the customer less favourable terms than this general policy.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Event Tickets</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Refunds for event tickets purchased through Jobsy Pan di Ends:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Event cancelled by organiser:</strong> Full refund issued automatically within 5-10 business days</li>
                <li><strong>Event postponed:</strong> Tickets remain valid for the new date; refunds available if the new date does not suit you, requested within 7 days of the postponement announcement</li>
                <li><strong>Voluntary cancellation by attendee:</strong> Refund available if requested more than 48 hours before the event start time, minus a 10% processing fee</li>
                <li><strong>Within 48 hours of event:</strong> No refund for voluntary cancellations</li>
                <li><strong>After the event:</strong> No refunds are available</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Ad Campaigns</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Refunds for advertising campaigns on Jobsy:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Ad rejected by admin:</strong> Full refund of the campaign budget if your ad is rejected during the approval process</li>
                <li><strong>Campaign not yet started:</strong> Full refund if cancelled before the campaign start date</li>
                <li><strong>Active campaign:</strong> Partial refund for the unspent portion of the budget, minus a 15% early termination fee</li>
                <li><strong>Completed campaign:</strong> No refunds for campaigns that have run to completion</li>
                <li><strong>Performance disputes:</strong> No refunds for low performance or click-through rates; advertising results are not guaranteed</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Job Boosts</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Refunds for job listing boosts:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Before boost activation:</strong> Full refund if the boost has not yet been applied</li>
                <li><strong>Within first 24 hours:</strong> 75% refund if cancelled within the first 24 hours of the boost period</li>
                <li><strong>After 24 hours:</strong> No refund for active or completed boosts</li>
                <li><strong>Technical issues:</strong> Full refund if the boost was not applied due to a platform error</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Non-Refundable Items</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                The following are not eligible for refunds:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Platform service fees and transaction processing fees</li>
                <li>Completed services where no complaint was raised within 48 hours</li>
                <li>Event tickets after the event has taken place</li>
                <li>Ad campaigns that have fully delivered their impressions or clicks</li>
                <li>Accounts suspended or terminated for violation of our Terms of Service</li>
                <li>Subscription fees for periods already used</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Refund Timeframes</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Once a refund is approved:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Credit/debit card:</strong> 5-10 business days to appear on your statement</li>
                <li><strong>Bank transfer:</strong> 3-7 business days</li>
                <li><strong>Jobsy wallet credit:</strong> Instantly applied to your account balance</li>
                <li><strong>Mobile money:</strong> 1-3 business days</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Processing times may vary depending on your financial institution.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. How to Request a Refund</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                To submit a refund request:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5">
                <li>Navigate to <strong>Payments &gt; Transaction History</strong> in your account</li>
                <li>Select the transaction you wish to request a refund for</li>
                <li>Click <strong>"Request Refund"</strong> and provide a reason for the request</li>
                <li>Attach any supporting evidence (photos, screenshots, messages) if applicable</li>
                <li>Submit the request for review</li>
              </ol>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Alternatively, you may email <strong>support@jobsyja.com</strong> with your
                transaction ID and reason for the refund request. We aim to review and respond
                to all refund requests within 3 business days.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Dispute Resolution</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                If your refund request is denied and you wish to dispute the decision:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Internal appeal:</strong> Reply to the refund decision email within 7 days with additional evidence or explanation</li>
                <li><strong>Mediation:</strong> If the appeal is unsuccessful, Jobsy may offer mediation between the parties at no additional cost</li>
                <li><strong>External resolution:</strong> You may seek resolution through the Consumer Affairs Commission of Jamaica or the courts of Jamaica</li>
              </ol>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Jobsy reserves the right to make final decisions on refund disputes where
                mediation does not result in agreement between the parties.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We may update this Refund Policy from time to time. Changes will be posted on
                this page with an updated "Last updated" date. Continued use of the platform
                after changes are posted constitutes acceptance of the revised policy.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If you have any questions about this Refund Policy, please contact us at:
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
