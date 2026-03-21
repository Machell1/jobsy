import { Megaphone } from 'lucide-react'

export default function AdvertiserTermsPage() {
  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-green-800 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Megaphone className="h-10 w-10 text-gold mx-auto mb-3" />
          <h1 className="text-4xl font-bold mb-2">Advertiser Terms</h1>
          <p className="text-white/70 text-sm">Last updated: March 15, 2026</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 prose-sm">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Overview</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                These Advertiser Terms ("Terms") govern the use of Jobsy's advertising services.
                By creating or submitting an advertising campaign on Jobsy, you ("Advertiser")
                agree to be bound by these Terms in addition to Jobsy's general Terms of Service.
                These Terms are governed by the laws of Jamaica.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Ad Content Rules</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                All advertisements must comply with the following content standards:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Legality:</strong> Ads must not promote illegal products, services, or activities under Jamaican law</li>
                <li><strong>Truthfulness:</strong> All claims must be accurate and substantiated; no misleading, deceptive, or false claims</li>
                <li><strong>No adult content:</strong> Sexually explicit material, nudity, or adult-oriented services are prohibited</li>
                <li><strong>No harmful content:</strong> Ads must not promote violence, discrimination, hate speech, or dangerous substances</li>
                <li><strong>No competitor disparagement:</strong> Ads must not make false or misleading claims about competing businesses</li>
                <li><strong>Intellectual property:</strong> Ads must not infringe on trademarks, copyrights, or other intellectual property rights</li>
                <li><strong>Transparency:</strong> Ads must be clearly identifiable as advertising and not disguised as organic content</li>
                <li><strong>Compliance:</strong> Ads must comply with Jamaica's Consumer Protection Act and Fair Competition Act</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Admin Approval Process</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                All advertisements are subject to review and approval before publication:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5">
                <li>Submit your ad campaign through the Advertiser Dashboard</li>
                <li>Our team reviews the ad within 1-2 business days</li>
                <li>You will receive notification of approval, rejection, or request for modifications</li>
                <li>Approved ads go live on the scheduled start date</li>
                <li>Rejected ads include a reason and guidance for resubmission</li>
              </ol>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Jobsy reserves the right to reject any ad at its sole discretion, remove
                previously approved ads that are later found to violate these Terms, and
                request modifications to ads at any time.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Creative Requirements</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Ad creatives must meet the following specifications:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Image ads:</strong> JPEG or PNG format, minimum 600x400 pixels, maximum file size 5MB</li>
                <li><strong>Video ads:</strong> MP4 format, maximum 30 seconds duration, maximum file size 50MB, minimum resolution 720p</li>
                <li><strong>Text:</strong> Headline maximum 60 characters, description maximum 150 characters</li>
                <li><strong>Landing URL:</strong> Must link to a valid, working webpage relevant to the ad content</li>
                <li><strong>Branding:</strong> Must clearly identify the advertiser's business name or brand</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Ads that do not meet these specifications will be returned for revision. Low-quality
                or pixelated images will be rejected.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Billing and Payment</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Jobsy offers the following advertising pricing models:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>CPM (Cost Per Mille):</strong> You pay for every 1,000 impressions your ad receives</li>
                <li><strong>CPC (Cost Per Click):</strong> You pay each time a user clicks on your ad</li>
                <li><strong>Fixed rate:</strong> A flat fee for a specified placement and duration</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-3">
                Payment terms:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>All prices are in Jamaican Dollars (JMD) unless otherwise stated</li>
                <li>Payment is required before the campaign goes live (prepaid model)</li>
                <li>Campaign budgets are set by the Advertiser and cannot be exceeded without approval</li>
                <li>Jobsy will provide itemised billing statements accessible through the Advertiser Dashboard</li>
                <li>Invoices are generated monthly for ongoing campaigns</li>
                <li>Late payments may result in suspension of active campaigns</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Refund Policy for Rejected Ads</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                If your ad is rejected during the approval process:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>The full campaign budget is refunded to your original payment method</li>
                <li>Refunds are processed within 5-10 business days</li>
                <li>You may revise and resubmit the ad at no additional cost</li>
                <li>If a previously approved ad is removed for policy violations, spent budget is non-refundable</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                For additional refund details, please refer to our Refund Policy.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Targeting Restrictions</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Jobsy provides targeting options to help reach relevant audiences. The following
                targeting restrictions apply:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Targeting must not be used to discriminate against protected groups</li>
                <li>Ads for age-restricted products or services must use appropriate age targeting</li>
                <li>Location targeting is limited to parishes and regions within Jamaica</li>
                <li>You may not target users based on sensitive personal data (health conditions, political beliefs, etc.)</li>
                <li>Retargeting is subject to user privacy preferences and the Data Protection Act, 2020 of Jamaica</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Performance and Disclaimers</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Important disclaimers regarding advertising performance:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Jobsy does not guarantee any specific results, including impressions, clicks, conversions, or sales</li>
                <li>Performance metrics are provided as estimates only and may vary</li>
                <li>Jobsy is not liable for any business losses resulting from ad performance</li>
                <li>Click fraud protection is in place, but Jobsy cannot guarantee elimination of all fraudulent activity</li>
                <li>Metrics reported in the Advertiser Dashboard are the official record for billing purposes</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Advertiser Responsibilities</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                As an Advertiser, you are responsible for:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Ensuring all ad content complies with these Terms and applicable laws</li>
                <li>Obtaining all necessary rights and permissions for ad creative materials</li>
                <li>Maintaining a valid payment method on file</li>
                <li>Monitoring your campaign performance and budget</li>
                <li>Promptly updating or removing ads that become inaccurate or outdated</li>
                <li>Indemnifying Jobsy against claims arising from your ad content</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Termination</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Jobsy may suspend or terminate your advertising account at any time if you
                violate these Terms, engage in fraudulent activity, or fail to meet payment
                obligations. Upon termination, active campaigns will be stopped, and any unspent
                prepaid budget will be refunded minus applicable fees. You may also choose to
                close your advertising account at any time through the Advertiser Dashboard.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Changes to These Terms</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We may update these Advertiser Terms from time to time. Advertisers with active
                campaigns will be notified of material changes via email. Continued use of the
                advertising services after changes are posted constitutes acceptance of the
                revised Terms.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">12. Contact Us</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                For advertising enquiries, please contact us at:
              </p>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="font-medium text-gray-900">Jobsy Advertising Team</p>
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
