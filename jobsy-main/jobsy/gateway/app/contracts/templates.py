"""Category-specific contract templates for the Jobsy platform.

Each template function accepts job, hirer, provider, and bid details and
returns a dict with ``title``, ``scope_of_work``, and ``terms_and_conditions``.

All templates include Jamaican governing law and jurisdiction clauses, digital
signature provisions under the Electronic Transactions Act 2006, and standard
commercial protections (cancellation, refund, dispute resolution, limitation
of liability).
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _format_amount(amount: Decimal | float, currency: str = "JMD") -> str:
    return f"{currency} {float(amount):,.2f}"


def _format_date(d: date | str | None) -> str:
    if d is None:
        return "To be agreed by both parties"
    if isinstance(d, str):
        return d
    return d.strftime("%B %d, %Y")


def _end_date(start: date | None, duration_days: int | None) -> date | None:
    if start and duration_days:
        return start + timedelta(days=duration_days)
    return None


def _common_terms(
    *,
    hirer_name: str,
    provider_name: str,
    job_title: str,
    job_description: str,
    proposal: str,
    amount: Decimal | float,
    currency: str,
    start_date: date | None,
    end_date: date | None,
    location_text: str | None,
    parish: str | None,
    contract_id: str,
    generated_date: str,
    extra_clauses: str = "",
    cancellation_fee_percent: float | None = None,
    deposit_percent: float | None = None,
    is_international: bool = False,
    milestones: list[dict[str, Any]] | None = None,
) -> str:
    """Return the terms-and-conditions text shared across all categories."""

    location_block = location_text or "Remote / To be agreed"
    if parish:
        location_block += f", {parish}"

    # Dynamic deposit terms
    dep_pct = deposit_percent or 25
    deposit_text = f"A deposit of {dep_pct:.0f}%" if dep_pct else "A deposit of 25%"

    # Dynamic cancellation fee
    if cancellation_fee_percent and 1 <= cancellation_fee_percent <= 30:
        cancel_fee_text = f"""
   - PROVIDER CANCELLATION FEE: The Provider has set a cancellation fee of
     {cancellation_fee_percent:.0f}% of the total contract value
     ({_format_amount(float(amount) * cancellation_fee_percent / 100, currency)}).
     If the Client cancels this Agreement after it has been signed by both
     parties, the Provider is entitled to receive this cancellation fee
     regardless of whether work has commenced.
   - ABUSE PROTECTION: Repeated or malicious cancellations (more than 3
     cancellations within a 30-day period) will result in an automatic
     account review. Accounts found to be engaging in fraudulent or
     malicious cancellation patterns will be frozen and may be referred
     to the Jamaica Constabulary Force (JCF)."""
    else:
        cancel_fee_text = ""

    # Milestone payment schedule
    milestone_text = ""
    if milestones:
        milestone_text = "\n\n   Payment Milestones:\n"
        for i, m in enumerate(milestones, 1):
            m_amount = _format_amount(m.get("amount", 0), currency)
            milestone_text += f"   {i}. {m.get('title', f'Phase {i}')}: {m_amount}\n"
            if m.get("description"):
                milestone_text += f"      {m['description']}\n"
        milestone_text += """
   Funds for each milestone shall be released from escrow only upon the
   Client's approval of the completed milestone through the Jobsy Platform.
   The Provider must submit evidence of completion for each milestone before
   requesting payment release."""

    # International jurisdiction clause
    if is_international:
        jurisdiction_text = """\
14. GOVERNING LAW AND JURISDICTION
    This Agreement is primarily governed by the Laws of Jamaica. Where one
    or both parties are domiciled outside of Jamaica, the following additional
    provisions apply:

    a) The United Nations Commission on International Trade Law (UNCITRAL)
       Model Law on International Commercial Arbitration shall apply to
       disputes that cannot be resolved through the Jobsy Platform's
       dispute resolution process.
    b) International disputes may be referred to arbitration under the rules
       of the International Chamber of Commerce (ICC), with the seat of
       arbitration in Kingston, Jamaica.
    c) The New York Convention on the Recognition and Enforcement of Foreign
       Arbitral Awards (1958) shall apply to the enforcement of any arbitral
       award.
    d) Each party submits to the non-exclusive jurisdiction of the Courts
       of Jamaica for any proceedings not subject to arbitration.
    e) This Agreement shall be interpreted in English regardless of any
       translations provided."""
    else:
        jurisdiction_text = """\
14. GOVERNING LAW AND JURISDICTION
    This Agreement is governed by the Laws of Jamaica. The parties submit
    to the exclusive jurisdiction of the Courts of Jamaica for any disputes
    arising from or in connection with this Agreement."""

    return f"""\
INDEPENDENT SERVICE PROVIDER AGREEMENT

This Service Agreement ("Agreement") is entered into through the Jobsy
Platform on {generated_date}.

1. PARTIES
   Client: {hirer_name} ("Client")
   Service Provider: {provider_name} ("Provider")

2. INDEPENDENT CONTRACTOR STATUS
   The Provider is an independent contractor and not an employee of the Client
   or Jobsy Limited. Nothing in this Agreement shall create an employer-employee
   relationship. The Provider is responsible for their own tax obligations
   including Income Tax and NIS contributions as required under the laws of
   Jamaica.

3. SCOPE OF WORK
   Job Title: {job_title}

   Description:
   {job_description}

   Provider Proposal:
   {proposal}

4. COMPENSATION
   The Client agrees to pay the Provider {_format_amount(amount, currency)}
   for the services described above. Payment shall be processed through the
   Jobsy Platform escrow system.

   Payment Terms:
   - The Client shall pay the FULL contract amount to Jobsy upon contract
     activation. These funds will be held in escrow by Jobsy Limited.
   - {deposit_text} shall be released to the Provider upon contract activation
     to enable commencement of work.
   - The remaining balance is released upon satisfactory completion of the
     work or according to the milestone schedule below.
   - All payments are made exclusively through the Jobsy Platform.
   - The Provider must submit a completion confirmation before final
     payment is released.
   - Jobsy will disburse funds according to the milestones and obligations
     agreed upon in this contract. No funds shall be released until the
     corresponding obligations are fulfilled.{milestone_text}

5. TIMELINE
   Start Date: {_format_date(start_date)}
   Estimated Completion: {_format_date(end_date)}

   Time is of the essence. If the Provider anticipates a delay, they must
   notify the Client through the Jobsy Platform at least 48 hours in advance.

6. LOCATION
   {location_block}

7. CANCELLATION POLICY
   Either party may request cancellation of this Agreement through the Jobsy
   Platform. All cancellation requests are subject to review by Jobsy Limited
   within seven (7) working days.

   a) CLIENT CANCELLATION:
   - If the Client cancels before work has commenced, a full refund will be
     issued minus any applicable cancellation fee set by the Provider.
   - If the Client cancels after work has commenced, the Provider shall be
     compensated for work completed up to the date of cancellation based on
     approved milestones, plus any applicable cancellation fee.
   - The Client CANNOT alter, modify, or renegotiate the terms of this
     Agreement once both parties have signed. Any new terms require a
     separate Addendum Agreement.{cancel_fee_text}

   b) PROVIDER CANCELLATION:
   - If the Provider cancels before work has commenced, a full refund shall
     be issued to the Client.
   - If the Provider cancels after work has commenced, the Provider must
     return any unearned payments within 7 business days. Payments for
     completed and approved milestones are retained by the Provider.

   c) JOBSY REVIEW PERIOD:
   - All cancellation requests are reviewed by Jobsy Limited within seven
     (7) working days. During this review period, escrowed funds remain
     held by Jobsy.
   - Upon completion of the review, Jobsy will disburse funds according
     to the determination, including any applicable cancellation fees,
     completed milestone payments, and refunds.

   d) NEW ENGAGEMENTS:
   - The Client may issue a new job directly to the same Provider under
     separate terms. Any new contract created after this Agreement shall
     be independent and shall NOT affect, modify, or supersede the terms
     of this Agreement.
   - The workflow order of milestones may be renegotiated by mutual
     agreement. If the Provider disagrees with a proposed reordering,
     the original milestone sequence shall be upheld.

8. REFUND POLICY
   Refunds will be processed through the Jobsy Platform within 10 business
   days of an approved refund request.
   - Full refund: Work not started and cancellation within 48 hours of
     contract activation.
   - Partial refund: Work started but not completed, calculated based on
     approved milestones.
   - No refund: Work completed and accepted by the Client.
   - Cancellation fee deductions: Any Provider cancellation fee shall be
     deducted from the refund amount before disbursement to the Client.

9. DISPUTE RESOLUTION
   Any disputes shall first be addressed through the Jobsy Platform's
   built-in dispute resolution process. If unresolved within 14 days, the
   parties agree to mediation administered by a qualified mediator in
   Jamaica before pursuing legal action.

   PROTECTION AGAINST NON-PAYMENT:
   - The Client's full payment is held in escrow by Jobsy. The Provider is
     protected against non-payment as funds are secured before work begins.

   PROTECTION AGAINST POOR QUALITY WORK:
   - The Client may dispute the quality of work through the Jobsy Platform's
     dispute resolution system before approving milestone payments.
   - Evidence including photographs, videos, and written statements may be
     submitted by both parties for review.
   - Jobsy's dispute resolution team will review evidence and make a binding
     determination on fund disbursement.

   PROTECTION AGAINST BREACH OF CONTRACT:
   - Any party found to be in material breach of this Agreement may have
     their Jobsy account frozen pending investigation.
   - Repeated breaches across multiple contracts will result in permanent
     account suspension.

10. LIMITATION OF LIABILITY
    Neither party shall be liable for indirect, incidental, special, or
    consequential damages arising out of or in connection with this
    Agreement. The Provider's total liability shall not exceed the agreed
    compensation amount. The Client's total liability shall not exceed the
    agreed compensation amount.
{extra_clauses}
11. CONFIDENTIALITY
    Both parties agree to keep confidential any proprietary information
    disclosed during the performance of this Agreement. This obligation
    survives the termination of this Agreement.

12. IMMUTABILITY AND AMENDMENTS
    Once both parties have digitally signed this Agreement, it becomes
    IMMUTABLE and cannot be altered, modified, or amended by either party
    acting alone or jointly. Any additional terms, changes to scope,
    pricing adjustments, or timeline modifications must be documented in
    a separate Addendum Agreement created through the Jobsy Platform.

    Addendum Agreements:
    - Do not modify, supersede, or override the terms of this primary
      Agreement unless explicitly stated and agreed by both parties.
    - Each Addendum has its own signing process and escrow arrangements.
    - The obligations of this primary Agreement remain in full force
      regardless of any Addendum Agreements.

13. DIGITAL SIGNATURE CLAUSE
    This Agreement is executed electronically in accordance with the
    Electronic Transactions Act, 2006 of Jamaica. Digital signatures applied
    through the Jobsy Platform carry the same legal effect as handwritten
    signatures. Each party acknowledges that their digital signature
    constitutes a binding acceptance of all terms herein.

{jurisdiction_text}

15. CRIMINAL CONDUCT
    Any criminal offence committed by either party during the performance
    of this Agreement, including but not limited to fraud, theft, assault,
    property damage, identity theft, money laundering, or any offence under
    the laws of Jamaica, shall be reported to the Jamaica Constabulary
    Force (JCF). Jobsy Limited reserves the right to:
    a) Immediately freeze the offending party's account;
    b) Retain all relevant evidence, transaction records, and communications
       for law enforcement purposes;
    c) Cooperate fully with the JCF and any other relevant authorities;
    d) Withhold disbursement of any escrowed funds pending the outcome of
       any investigation or legal proceedings.
    This clause does not limit either party's right to pursue criminal
    charges independently.

16. ANTI-MONEY LAUNDERING (AML) COMPLIANCE
    Both parties acknowledge that Jobsy Limited is required to comply with
    the Proceeds of Crime Act (POCA) of Jamaica and applicable anti-money
    laundering regulations. Jobsy reserves the right to:
    a) Monitor transactions for suspicious activity;
    b) Request additional identification or documentation from either party;
    c) Report suspicious transactions to the Financial Investigations
       Division (FID) of Jamaica;
    d) Freeze accounts and withhold funds where there are reasonable grounds
       to suspect money laundering or terrorist financing.

17. FORCE MAJEURE
    Neither party shall be liable for failure to perform obligations under
    this Agreement due to events beyond reasonable control, including but
    not limited to natural disasters, hurricanes, earthquakes, floods,
    pandemics, government orders, civil unrest, or acts of God. The
    affected party must notify the other party through the Jobsy Platform
    within 48 hours of the event. If the force majeure event continues for
    more than 30 days, either party may terminate this Agreement. In such
    cases, a full refund of unearned payments (based on unapproved
    milestones) shall be processed through the Jobsy Platform.

18. ENTIRE AGREEMENT
    This Agreement, together with any Addendum Agreements executed through
    the Jobsy Platform, constitutes the entire agreement between the parties
    and supersedes all prior negotiations, representations, and agreements
    relating to the subject matter hereof.

Generated by Jobsy Platform
Contract ID: {contract_id}"""


# ---------------------------------------------------------------------------
# Category templates
# ---------------------------------------------------------------------------

def general_services_template(
    job: dict[str, Any],
    hirer: dict[str, Any],
    provider: dict[str, Any],
    bid: dict[str, Any],
) -> dict[str, str]:
    """Template for general services -- plumbing, electrical, cleaning, etc."""
    start = bid.get("available_start_date")
    end = _end_date(start, bid.get("estimated_duration_days"))

    extra = """
    ADDITIONAL TERMS -- GENERAL SERVICES
    a) The Provider warrants that they hold all necessary licences, permits,
       and certifications required to perform the specified services in Jamaica.
    b) The Provider shall supply all tools, equipment, and materials unless
       otherwise agreed in writing.
    c) The Provider shall leave the work area clean and free of debris upon
       completion.
    d) Any warranty on workmanship shall be valid for a minimum of 30 days
       from the date of completion.
"""

    terms = _common_terms(
        hirer_name=hirer["name"],
        provider_name=provider["name"],
        job_title=job["title"],
        job_description=job["description"],
        proposal=bid["proposal"],
        amount=bid["amount"],
        currency=bid.get("currency", "JMD"),
        start_date=start,
        end_date=end,
        location_text=job.get("location_text"),
        parish=job.get("parish"),
        contract_id=bid["contract_id"],
        generated_date=bid["generated_date"],
        extra_clauses=extra,
        cancellation_fee_percent=bid.get("cancellation_fee_percent"),
        deposit_percent=bid.get("deposit_percent"),
        is_international=bid.get("is_international", False),
        milestones=bid.get("milestones"),
    )

    return {
        "title": f"General Service Contract: {job['title']}",
        "scope_of_work": f"Job Description:\n{job['description']}\n\nProvider Proposal:\n{bid['proposal']}",
        "terms_and_conditions": terms,
    }


def creative_services_template(
    job: dict[str, Any],
    hirer: dict[str, Any],
    provider: dict[str, Any],
    bid: dict[str, Any],
) -> dict[str, str]:
    """Template for creative services -- photography, design, videography."""
    start = bid.get("available_start_date")
    end = _end_date(start, bid.get("estimated_duration_days"))

    extra = """
    ADDITIONAL TERMS -- CREATIVE SERVICES
    a) Intellectual Property: Unless otherwise agreed in writing, the Client
       shall own all final deliverables upon full payment. The Provider retains
       the right to use the work in their portfolio.
    b) Revisions: Up to two (2) rounds of revisions are included in the agreed
       price. Additional revisions will be charged at a mutually agreed rate.
    c) Delivery Format: Final deliverables shall be provided in industry-standard
       formats as agreed upon prior to commencement.
    d) The Provider shall not use the Client's likeness, brand, or proprietary
       content for purposes other than portfolio display without written consent.
"""

    terms = _common_terms(
        hirer_name=hirer["name"],
        provider_name=provider["name"],
        job_title=job["title"],
        job_description=job["description"],
        proposal=bid["proposal"],
        amount=bid["amount"],
        currency=bid.get("currency", "JMD"),
        start_date=start,
        end_date=end,
        location_text=job.get("location_text"),
        parish=job.get("parish"),
        contract_id=bid["contract_id"],
        generated_date=bid["generated_date"],
        extra_clauses=extra,
        cancellation_fee_percent=bid.get("cancellation_fee_percent"),
        deposit_percent=bid.get("deposit_percent"),
        is_international=bid.get("is_international", False),
        milestones=bid.get("milestones"),
    )

    return {
        "title": f"Creative Service Contract: {job['title']}",
        "scope_of_work": f"Job Description:\n{job['description']}\n\nProvider Proposal:\n{bid['proposal']}",
        "terms_and_conditions": terms,
    }


def event_services_template(
    job: dict[str, Any],
    hirer: dict[str, Any],
    provider: dict[str, Any],
    bid: dict[str, Any],
) -> dict[str, str]:
    """Template for event services -- catering, DJ, decoration, venue setup."""
    start = bid.get("available_start_date")
    end = _end_date(start, bid.get("estimated_duration_days"))

    extra = """
    ADDITIONAL TERMS -- EVENT SERVICES
    a) Event Date Guarantee: The Provider guarantees availability for the
       agreed event date(s). Cancellation by the Provider within 7 days of
       the event shall entitle the Client to a full refund plus 10%
       compensation for inconvenience.
    b) Setup and Teardown: The Provider is responsible for all setup and
       teardown activities unless otherwise agreed.
    c) Permits and Licences: The Provider shall obtain any permits or
       licences required for their specific services (e.g., food handling,
       music performance).
    d) Force Majeure: Neither party shall be liable for cancellation due to
       natural disasters, government orders, or other events beyond
       reasonable control. In such cases, a full refund shall be issued.
    e) Deposit: A non-refundable deposit of 25% is required to secure the
       event date.
"""

    terms = _common_terms(
        hirer_name=hirer["name"],
        provider_name=provider["name"],
        job_title=job["title"],
        job_description=job["description"],
        proposal=bid["proposal"],
        amount=bid["amount"],
        currency=bid.get("currency", "JMD"),
        start_date=start,
        end_date=end,
        location_text=job.get("location_text"),
        parish=job.get("parish"),
        contract_id=bid["contract_id"],
        generated_date=bid["generated_date"],
        extra_clauses=extra,
        cancellation_fee_percent=bid.get("cancellation_fee_percent"),
        deposit_percent=bid.get("deposit_percent"),
        is_international=bid.get("is_international", False),
        milestones=bid.get("milestones"),
    )

    return {
        "title": f"Event Service Contract: {job['title']}",
        "scope_of_work": f"Job Description:\n{job['description']}\n\nProvider Proposal:\n{bid['proposal']}",
        "terms_and_conditions": terms,
    }


def home_improvement_template(
    job: dict[str, Any],
    hirer: dict[str, Any],
    provider: dict[str, Any],
    bid: dict[str, Any],
) -> dict[str, str]:
    """Template for home improvement -- construction, renovation."""
    start = bid.get("available_start_date")
    end = _end_date(start, bid.get("estimated_duration_days"))

    extra = """
    ADDITIONAL TERMS -- HOME IMPROVEMENT
    a) Permits and Approvals: The Provider shall obtain all necessary
       building permits and approvals from the relevant Jamaican authorities
       (e.g., Municipal Corporation, NEPA) before commencing work.
    b) Materials: Unless otherwise agreed, the Provider shall supply all
       materials. Material specifications and brands shall be documented and
       approved by the Client before purchase.
    c) Warranty: The Provider warrants all workmanship for a period of
       twelve (12) months from the date of completion. Defects arising from
       faulty workmanship within this period shall be rectified at no
       additional cost.
    d) Insurance: The Provider shall maintain adequate insurance coverage
       including public liability insurance for the duration of the project.
    e) Site Safety: The Provider shall comply with all applicable safety
       regulations and maintain a safe work environment at all times.
    f) Progress Reports: The Provider shall provide weekly progress updates
       to the Client through the Jobsy Platform.
    g) Payment Milestones: For projects exceeding J$100,000, payments may
       be structured in milestones tied to completion of defined phases.
"""

    terms = _common_terms(
        hirer_name=hirer["name"],
        provider_name=provider["name"],
        job_title=job["title"],
        job_description=job["description"],
        proposal=bid["proposal"],
        amount=bid["amount"],
        currency=bid.get("currency", "JMD"),
        start_date=start,
        end_date=end,
        location_text=job.get("location_text"),
        parish=job.get("parish"),
        contract_id=bid["contract_id"],
        generated_date=bid["generated_date"],
        extra_clauses=extra,
        cancellation_fee_percent=bid.get("cancellation_fee_percent"),
        deposit_percent=bid.get("deposit_percent"),
        is_international=bid.get("is_international", False),
        milestones=bid.get("milestones"),
    )

    return {
        "title": f"Home Improvement Contract: {job['title']}",
        "scope_of_work": f"Job Description:\n{job['description']}\n\nProvider Proposal:\n{bid['proposal']}",
        "terms_and_conditions": terms,
    }


def professional_services_template(
    job: dict[str, Any],
    hirer: dict[str, Any],
    provider: dict[str, Any],
    bid: dict[str, Any],
) -> dict[str, str]:
    """Template for professional services -- tutoring, consulting, legal, accounting."""
    start = bid.get("available_start_date")
    end = _end_date(start, bid.get("estimated_duration_days"))

    extra = """
    ADDITIONAL TERMS -- PROFESSIONAL SERVICES
    a) Professional Standards: The Provider shall perform all services in
       accordance with the professional standards and ethical codes
       applicable to their field in Jamaica.
    b) Qualifications: The Provider warrants that they possess the
       appropriate qualifications, certifications, and professional
       registration required to render the specified services.
    c) Confidentiality (Enhanced): The Provider shall treat all client
       information, documents, and communications as strictly confidential.
       This obligation extends beyond the termination of this Agreement
       for a period of two (2) years.
    d) Deliverables: All reports, analyses, recommendations, and other
       deliverables shall be the property of the Client upon full payment.
    e) Non-Solicitation: During the term of this Agreement and for six (6)
       months thereafter, neither party shall solicit the other's employees,
       contractors, or clients introduced through this engagement.
    f) Professional Liability: The Provider shall maintain appropriate
       professional indemnity insurance where required by their regulatory
       body.
"""

    terms = _common_terms(
        hirer_name=hirer["name"],
        provider_name=provider["name"],
        job_title=job["title"],
        job_description=job["description"],
        proposal=bid["proposal"],
        amount=bid["amount"],
        currency=bid.get("currency", "JMD"),
        start_date=start,
        end_date=end,
        location_text=job.get("location_text"),
        parish=job.get("parish"),
        contract_id=bid["contract_id"],
        generated_date=bid["generated_date"],
        extra_clauses=extra,
        cancellation_fee_percent=bid.get("cancellation_fee_percent"),
        deposit_percent=bid.get("deposit_percent"),
        is_international=bid.get("is_international", False),
        milestones=bid.get("milestones"),
    )

    return {
        "title": f"Professional Service Contract: {job['title']}",
        "scope_of_work": f"Job Description:\n{job['description']}\n\nProvider Proposal:\n{bid['proposal']}",
        "terms_and_conditions": terms,
    }


def transportation_template(
    job: dict[str, Any],
    hirer: dict[str, Any],
    provider: dict[str, Any],
    bid: dict[str, Any],
) -> dict[str, str]:
    """Template for transportation -- delivery, transport."""
    start = bid.get("available_start_date")
    end = _end_date(start, bid.get("estimated_duration_days"))

    extra = """
    ADDITIONAL TERMS -- TRANSPORTATION & DELIVERY
    a) Vehicle and Licensing: The Provider warrants that they hold a valid
       Jamaican driver's licence of the appropriate class and that all
       vehicles used are properly insured, registered, and roadworthy.
    b) Goods Handling: The Provider shall handle all goods with reasonable
       care. The Provider is liable for damage to goods caused by
       negligence during transit.
    c) Delivery Confirmation: The Provider shall obtain a signature or
       photographic proof of delivery upon completion. Delivery confirmation
       must be uploaded to the Jobsy Platform.
    d) Insurance: The Provider shall maintain adequate goods-in-transit
       insurance covering the value of items being transported.
    e) Delays: The Provider shall notify the Client immediately of any
       anticipated delays. Repeated unexcused delays may constitute grounds
       for contract termination.
    f) Prohibited Items: The Provider shall not transport illegal, hazardous,
       or restricted items. The Client warrants that all goods comply with
       Jamaican law.
"""

    terms = _common_terms(
        hirer_name=hirer["name"],
        provider_name=provider["name"],
        job_title=job["title"],
        job_description=job["description"],
        proposal=bid["proposal"],
        amount=bid["amount"],
        currency=bid.get("currency", "JMD"),
        start_date=start,
        end_date=end,
        location_text=job.get("location_text"),
        parish=job.get("parish"),
        contract_id=bid["contract_id"],
        generated_date=bid["generated_date"],
        extra_clauses=extra,
        cancellation_fee_percent=bid.get("cancellation_fee_percent"),
        deposit_percent=bid.get("deposit_percent"),
        is_international=bid.get("is_international", False),
        milestones=bid.get("milestones"),
    )

    return {
        "title": f"Transportation & Delivery Contract: {job['title']}",
        "scope_of_work": f"Job Description:\n{job['description']}\n\nProvider Proposal:\n{bid['proposal']}",
        "terms_and_conditions": terms,
    }


# ---------------------------------------------------------------------------
# Category -> template mapping
# ---------------------------------------------------------------------------

CATEGORY_TEMPLATE_MAP: dict[str, Any] = {
    # General services
    "plumbing": general_services_template,
    "electrical": general_services_template,
    "cleaning": general_services_template,
    "handyman": general_services_template,
    "pest_control": general_services_template,
    "landscaping": general_services_template,
    "general": general_services_template,
    # Creative services
    "photography": creative_services_template,
    "videography": creative_services_template,
    "graphic_design": creative_services_template,
    "design": creative_services_template,
    "creative": creative_services_template,
    "music": creative_services_template,
    "writing": creative_services_template,
    # Event services
    "catering": event_services_template,
    "dj": event_services_template,
    "decoration": event_services_template,
    "event_planning": event_services_template,
    "events": event_services_template,
    "venue": event_services_template,
    "entertainment": event_services_template,
    # Home improvement
    "construction": home_improvement_template,
    "renovation": home_improvement_template,
    "home_improvement": home_improvement_template,
    "painting": home_improvement_template,
    "roofing": home_improvement_template,
    "tiling": home_improvement_template,
    "carpentry": home_improvement_template,
    "welding": home_improvement_template,
    # Professional services
    "tutoring": professional_services_template,
    "consulting": professional_services_template,
    "legal": professional_services_template,
    "accounting": professional_services_template,
    "professional": professional_services_template,
    "it": professional_services_template,
    "technology": professional_services_template,
    "marketing": professional_services_template,
    # Transportation
    "delivery": transportation_template,
    "transport": transportation_template,
    "transportation": transportation_template,
    "courier": transportation_template,
    "moving": transportation_template,
    "trucking": transportation_template,
}


def get_template_for_category(category: str) -> Any:
    """Return the template function for a given job category.

    Falls back to ``general_services_template`` for unknown categories.
    """
    normalised = category.lower().strip().replace(" ", "_").replace("-", "_")
    return CATEGORY_TEMPLATE_MAP.get(normalised, general_services_template)
