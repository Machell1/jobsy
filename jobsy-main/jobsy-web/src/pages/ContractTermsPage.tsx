import { FileText } from 'lucide-react'

export default function ContractTermsPage() {
  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-green-800 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <FileText className="h-10 w-10 text-gold mx-auto mb-3" />
          <h1 className="text-4xl font-bold mb-2">Contract Terms</h1>
          <p className="text-white/70 text-sm">Last updated: March 15, 2026</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 prose-sm">
          <div className="space-y-8">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-2">
              <p className="text-sm text-green-800 leading-relaxed">
                These standard contract terms are embedded in every job contract created on the
                Jobsy platform. By accepting a contract on Jobsy, both parties agree to these
                terms. Digital signatures and electronic acceptance are recognised under Jamaica's{' '}
                <strong>Electronic Transactions Act (ETA), 2006</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Definitions</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                In these Contract Terms:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>"Platform"</strong> means the Jobsy service marketplace</li>
                <li><strong>"Client"</strong> means the party requesting and paying for services</li>
                <li><strong>"Provider"</strong> means the party providing the services</li>
                <li><strong>"Contract"</strong> means the agreement formed between Client and Provider through the Platform</li>
                <li><strong>"Services"</strong> means the work described in the job listing or booking</li>
                <li><strong>"Contract Price"</strong> means the total amount agreed for the Services, inclusive of all fees</li>
                <li><strong>"Escrow"</strong> means the secure holding of funds by Jobsy pending completion of Services</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Formation of Contract</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                A binding contract between the Client and Provider is formed when:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5">
                <li>The Client submits a booking request or accepts a Provider's quote</li>
                <li>The Provider accepts the booking or the Client accepts the quote</li>
                <li>Both parties confirm the scope, price, and timeline of the Services</li>
                <li>Payment or escrow deposit is made by the Client</li>
              </ol>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Electronic acceptance through the Jobsy platform constitutes a valid and binding
                agreement under the Electronic Transactions Act (ETA), 2006 of Jamaica. Digital
                signatures, click-to-accept actions, and electronic confirmations on the Platform
                carry the same legal weight as handwritten signatures.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Parties' Obligations</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                <strong>Client obligations:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Provide clear and complete requirements for the Services</li>
                <li>Make timely payment as agreed in the Contract</li>
                <li>Provide reasonable access, information, and cooperation needed for the Provider to perform the Services</li>
                <li>Review and approve completed work within the agreed timeframe (or 48 hours if not specified)</li>
                <li>Communicate any concerns or issues promptly through the Platform</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-4 mb-3">
                <strong>Provider obligations:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Perform the Services with reasonable care, skill, and diligence</li>
                <li>Complete the Services within the agreed timeframe</li>
                <li>Use appropriate materials and equipment for the Services</li>
                <li>Maintain all necessary licences, permits, and insurance for the work performed</li>
                <li>Communicate any delays, issues, or changes in scope promptly</li>
                <li>Comply with all applicable health, safety, and industry regulations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Payment Terms and Escrow</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Payment for Services is handled through the Jobsy platform:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Escrow protection:</strong> When a Client makes payment, funds are held in escrow by Jobsy until the Services are satisfactorily completed</li>
                <li><strong>Release of funds:</strong> Escrow funds are released to the Provider when the Client confirms completion, or automatically 48 hours after the Provider marks the job as complete if the Client does not dispute</li>
                <li><strong>Platform fee:</strong> Jobsy deducts its service fee from the Contract Price before releasing funds to the Provider; the fee percentage is disclosed before contract acceptance</li>
                <li><strong>Milestone payments:</strong> For larger projects, payments may be structured in milestones as agreed by both parties</li>
                <li><strong>Currency:</strong> All payments are in Jamaican Dollars (JMD) unless otherwise agreed</li>
                <li><strong>Taxes:</strong> Each party is responsible for their own tax obligations; Providers are responsible for declaring income received through the Platform</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Service Delivery Standards</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                All Services delivered through the Platform must meet the following standards:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li>Services must be performed to a professional standard consistent with the Provider's advertised qualifications</li>
                <li>Services must match the description provided in the listing or as agreed in writing through the Platform</li>
                <li>Work must be completed within the agreed timeframe; any anticipated delays must be communicated in advance</li>
                <li>The Provider must rectify any defects or deficiencies in the Services within a reasonable time at no additional cost</li>
                <li>Materials used must be of appropriate quality and fit for purpose</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Cancellation and Refund</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Either party may cancel a Contract subject to the following terms:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Cancellation by Client before work begins:</strong> Full refund of escrowed funds, minus any applicable cancellation fee as stated in the Provider's terms</li>
                <li><strong>Cancellation by Client after work begins:</strong> Payment for work completed to date, as reasonably determined; remaining escrowed funds returned to Client</li>
                <li><strong>Cancellation by Provider before work begins:</strong> Full refund of escrowed funds to the Client; repeated cancellations may affect the Provider's account standing</li>
                <li><strong>Cancellation by Provider after work begins:</strong> Client receives a full refund of escrowed funds; Provider forfeits payment for work completed</li>
                <li><strong>Mutual cancellation:</strong> Both parties may agree to cancel and determine a fair distribution of escrowed funds</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                For detailed refund timelines and processes, please refer to our Refund Policy.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Dispute Resolution</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                In the event of a dispute between the Client and Provider:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Direct negotiation:</strong> The parties should first attempt to resolve the dispute through direct communication on the Platform</li>
                <li><strong>Jobsy mediation:</strong> If direct negotiation fails, either party may request Jobsy mediation through the dispute resolution centre; Jobsy will review evidence from both parties and make a recommendation within 5 business days</li>
                <li><strong>Binding determination:</strong> If mediation does not resolve the dispute, Jobsy may make a binding determination regarding the release of escrowed funds based on the evidence provided</li>
                <li><strong>External resolution:</strong> Either party retains the right to seek resolution through the courts of Jamaica or through arbitration in accordance with Jamaican law</li>
              </ol>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                During a dispute, escrowed funds remain held by Jobsy until the dispute is
                resolved. Both parties agree to cooperate in good faith during the resolution
                process.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Intellectual Property</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Unless otherwise agreed in writing, intellectual property created during the
                performance of Services transfers to the Client upon full payment. The Provider
                retains the right to use non-confidential aspects of the work in their portfolio.
                Pre-existing intellectual property remains with its original owner. Any specific
                IP arrangements should be agreed in writing between the parties before work begins.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Confidentiality</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Both parties agree to keep confidential any proprietary or sensitive information
                shared during the course of the Contract. This obligation survives the termination
                or completion of the Contract. Confidential information does not include information
                that is publicly available, independently developed, or required to be disclosed
                by law.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Limitation of Liability</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Jobsy acts as an intermediary platform and is not a party to the Contract between
                the Client and Provider. Jobsy's liability is limited to the proper functioning
                of the escrow and dispute resolution services. Jobsy is not liable for the quality
                of Services, the conduct of either party, or any losses arising from the
                performance or non-performance of the Contract. Each party's liability to the
                other under the Contract is limited to the Contract Price.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Force Majeure</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Neither party shall be liable for failure to perform their obligations under the
                Contract if such failure results from circumstances beyond their reasonable
                control, including but not limited to natural disasters, government actions,
                pandemics, civil unrest, or interruption of essential services. The affected
                party must notify the other party promptly and take reasonable steps to mitigate
                the impact.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">12. Governing Law and Jurisdiction</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                These Contract Terms and all Contracts formed on the Platform are governed by
                and construed in accordance with the <strong>laws of Jamaica</strong>. Key legal
                references include:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                <li><strong>Electronic Transactions Act (ETA), 2006:</strong> Governs the validity of electronic contracts, digital signatures, and electronic records created on the Platform</li>
                <li><strong>Data Protection Act, 2020:</strong> Governs the handling of personal data shared between parties during the Contract</li>
                <li><strong>Consumer Protection Act:</strong> Protects consumer rights in service transactions</li>
              </ul>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Any legal proceedings arising from a Contract shall be brought exclusively in the
                <strong> courts of Jamaica</strong>, with venue in Kingston, Jamaica.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">13. Severability</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If any provision of these Contract Terms is found to be invalid, illegal, or
                unenforceable by a court of competent jurisdiction, the remaining provisions
                shall continue in full force and effect. The invalid provision shall be modified
                to the minimum extent necessary to make it valid and enforceable.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">14. Entire Agreement</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                These Contract Terms, together with the specific terms agreed in each individual
                Contract and Jobsy's Terms of Service, constitute the entire agreement between
                the parties. Any amendments to a Contract must be agreed in writing by both
                parties through the Platform.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">15. Contact Us</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If you have questions about these Contract Terms, please contact us at:
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
