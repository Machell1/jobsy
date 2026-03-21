"""
Jobsy HTML email templates.

Every function returns a complete, mobile-responsive HTML string that can be
passed straight to ``email_utils.send_email`` as the ``html_body`` argument.
"""

from __future__ import annotations

BASE_URL = "https://jobsyja.com"

# ── shared styling ──────────────────────────────────────────────────

_WRAPPER_OPEN = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{subject}</title>
<style>
  body {{ margin:0; padding:0; background:#f4f5f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }}
  .wrapper {{ max-width:600px; margin:0 auto; background:#ffffff; }}
  .header {{ background:#16a34a; padding:24px 32px; text-align:center; }}
  .header h1 {{ color:#ffffff; font-size:24px; margin:0; letter-spacing:.5px; }}
  .body {{ padding:32px; color:#1f2937; line-height:1.6; font-size:15px; }}
  .body h2 {{ color:#111827; font-size:20px; margin:0 0 16px; }}
  .body p {{ margin:0 0 14px; }}
  .cta {{ display:inline-block; background:#16a34a; color:#ffffff !important; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; font-size:15px; margin:8px 0 16px; }}
  .detail-table {{ width:100%; border-collapse:collapse; margin:16px 0; }}
  .detail-table td {{ padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:14px; }}
  .detail-table td.label {{ color:#6b7280; width:40%; }}
  .detail-table td.value {{ color:#111827; font-weight:600; }}
  .footer {{ background:#f9fafb; padding:24px 32px; text-align:center; font-size:12px; color:#9ca3af; line-height:1.6; }}
  .footer a {{ color:#16a34a; text-decoration:none; }}
  @media only screen and (max-width:620px) {{
    .body {{ padding:24px 16px; }}
    .header {{ padding:20px 16px; }}
  }}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header"><h1>Jobsy</h1></div>
  <div class="body">
"""

_WRAPPER_CLOSE = """
  </div>
  <div class="footer">
    <p>&copy; {year} Jobsy &middot; Jamaica&rsquo;s Service Marketplace</p>
    <p>
      <a href="{base}/support">Help Centre</a> &middot;
      <a href="{base}/settings/notifications">Notification Settings</a> &middot;
      <a href="{base}/unsubscribe">Unsubscribe</a>
    </p>
    <p>Jobsy Ltd &middot; Kingston, Jamaica</p>
  </div>
</div>
</body>
</html>
"""


def _wrap(subject: str, body_html: str) -> str:
    """Wrap inner HTML in the branded layout."""
    from datetime import datetime

    return (
        _WRAPPER_OPEN.format(subject=subject)
        + body_html
        + _WRAPPER_CLOSE.format(year=datetime.now().year, base=BASE_URL)
    )


# ── templates ───────────────────────────────────────────────────────


def welcome_email(user_name: str) -> str:
    """Welcome to Jobsy."""
    return _wrap(
        "Welcome to Jobsy!",
        f"""
    <h2>Welcome to Jobsy, {user_name}!</h2>
    <p>
      We're excited to have you join Jamaica's premier service marketplace.
      Whether you're looking to hire trusted professionals or offer your
      own skills, Jobsy makes it easy to connect with your community.
    </p>
    <p>Here are a few things you can do right away:</p>
    <ul style="padding-left:20px;margin:0 0 16px;">
      <li>Complete your profile so customers can find you</li>
      <li>Browse available jobs on the Job Board</li>
      <li>Discover upcoming events on Pan&nbsp;di&nbsp;Ends</li>
    </ul>
    <p><a class="cta" href="{BASE_URL}/#/profile">Complete Your Profile</a></p>
    <p>If you have any questions, our support team is always here to help.</p>
    """,
    )


def booking_confirmation(booking_details: dict) -> str:
    """Booking confirmed."""
    service = booking_details.get("service_name", "Service")
    provider = booking_details.get("provider_name", "Provider")
    date = booking_details.get("date", "")
    time = booking_details.get("time", "")
    location = booking_details.get("location", "")
    booking_id = booking_details.get("booking_id", "")

    return _wrap(
        "Booking Confirmed",
        f"""
    <h2>Booking Confirmed</h2>
    <p>Great news! Your booking has been confirmed. Here are the details:</p>

    <table class="detail-table">
      <tr><td class="label">Service</td><td class="value">{service}</td></tr>
      <tr><td class="label">Provider</td><td class="value">{provider}</td></tr>
      <tr><td class="label">Date</td><td class="value">{date}</td></tr>
      <tr><td class="label">Time</td><td class="value">{time}</td></tr>
      <tr><td class="label">Location</td><td class="value">{location}</td></tr>
      <tr><td class="label">Booking&nbsp;ID</td><td class="value">{booking_id}</td></tr>
    </table>

    <p><a class="cta" href="{BASE_URL}/#/bookings/{booking_id}">View Booking</a></p>
    <p>Need to make changes? You can manage your booking from the link above.</p>
    """,
    )


def payment_receipt(transaction: dict) -> str:
    """Payment receipt with fee breakdown."""
    txn_id = transaction.get("id", "")
    service = transaction.get("service_name", "Service")
    subtotal = transaction.get("subtotal", "0.00")
    platform_fee = transaction.get("platform_fee", "0.00")
    total = transaction.get("total", "0.00")
    currency = transaction.get("currency", "JMD")
    date = transaction.get("date", "")
    method = transaction.get("payment_method", "Card")

    return _wrap(
        "Payment Receipt",
        f"""
    <h2>Payment Receipt</h2>
    <p>Thank you for your payment. Here is your receipt:</p>

    <table class="detail-table">
      <tr><td class="label">Transaction&nbsp;ID</td><td class="value">{txn_id}</td></tr>
      <tr><td class="label">Service</td><td class="value">{service}</td></tr>
      <tr><td class="label">Date</td><td class="value">{date}</td></tr>
      <tr><td class="label">Payment&nbsp;Method</td><td class="value">{method}</td></tr>
    </table>

    <table class="detail-table">
      <tr><td class="label">Subtotal</td><td class="value">{currency} ${subtotal}</td></tr>
      <tr><td class="label">Platform Fee</td><td class="value">{currency} ${platform_fee}</td></tr>
      <tr>
        <td class="label" style="font-weight:700;color:#111827;">Total</td>
        <td class="value" style="font-size:16px;">{currency} ${total}</td>
      </tr>
    </table>

    <p><a class="cta" href="{BASE_URL}/#/payments/{txn_id}">View Payment Details</a></p>
    <p style="font-size:13px;color:#6b7280;">
      If you have questions about this charge, please contact our support team.
    </p>
    """,
    )


def contract_ready(contract: dict) -> str:
    """Contract ready to sign."""
    contract_id = contract.get("id", "")
    job_title = contract.get("job_title", "Job")
    client_name = contract.get("client_name", "")
    provider_name = contract.get("provider_name", "")
    amount = contract.get("amount", "")
    currency = contract.get("currency", "JMD")

    return _wrap(
        "Contract Ready to Sign",
        f"""
    <h2>Your Contract Is Ready</h2>
    <p>A contract has been prepared and is waiting for your signature.</p>

    <table class="detail-table">
      <tr><td class="label">Job</td><td class="value">{job_title}</td></tr>
      <tr><td class="label">Client</td><td class="value">{client_name}</td></tr>
      <tr><td class="label">Provider</td><td class="value">{provider_name}</td></tr>
      <tr><td class="label">Amount</td><td class="value">{currency} ${amount}</td></tr>
    </table>

    <p>Please review the terms carefully before signing.</p>
    <p><a class="cta" href="{BASE_URL}/#/contracts/{contract_id}">Review &amp; Sign Contract</a></p>
    <p style="font-size:13px;color:#6b7280;">
      This contract will expire in 7 days if not signed.
    </p>
    """,
    )


def review_request(booking: dict) -> str:
    """Please review your experience."""
    booking_id = booking.get("booking_id", "")
    service = booking.get("service_name", "Service")
    provider = booking.get("provider_name", "Provider")

    return _wrap(
        "How Was Your Experience?",
        f"""
    <h2>How Was Your Experience?</h2>
    <p>
      Your booking for <strong>{service}</strong> with
      <strong>{provider}</strong> has been completed.
    </p>
    <p>
      Your review helps other Jamaicans find reliable service providers and
      helps providers build their reputation. It only takes a minute!
    </p>
    <p><a class="cta" href="{BASE_URL}/#/bookings/{booking_id}/review">Leave a Review</a></p>
    <p style="font-size:13px;color:#6b7280;">
      Reviews are public and help build trust in the Jobsy community.
    </p>
    """,
    )


def bid_received(job: dict, bid: dict) -> str:
    """New bid on your job."""
    job_id = job.get("id", "")
    job_title = job.get("title", "Job")
    bidder_name = bid.get("bidder_name", "A provider")
    bid_amount = bid.get("amount", "")
    currency = bid.get("currency", "JMD")
    message = bid.get("message", "")

    msg_html = ""
    if message:
        msg_html = (
            '<tr><td class="label">Message</td>'
            f'<td class="value" style="font-weight:400;">{message}</td></tr>'
        )

    return _wrap(
        "New Bid on Your Job",
        f"""
    <h2>New Bid Received</h2>
    <p>
      <strong>{bidder_name}</strong> has placed a bid on your job
      <strong>{job_title}</strong>.
    </p>

    <table class="detail-table">
      <tr><td class="label">Bid Amount</td><td class="value">{currency} ${bid_amount}</td></tr>
      {msg_html}
    </table>

    <p><a class="cta" href="{BASE_URL}/#/job-board/{job_id}">View All Bids</a></p>
    <p style="font-size:13px;color:#6b7280;">
      Compare bids, check provider ratings, and choose the best fit.
    </p>
    """,
    )


def email_verification(user_name: str, code: str) -> str:
    """Verify your email address."""
    return _wrap(
        "Verify Your Email",
        f"""
    <h2>Verify Your Email Address</h2>
    <p>Hi {user_name},</p>
    <p>
      Thanks for signing up with Jobsy! Please use the code below to verify
      your email address and unlock full access to Jamaica's premier service
      marketplace.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;font-size:36px;font-weight:bold;color:#16a34a;letter-spacing:8px;
                  background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:16px 32px;">
        {code}
      </div>
    </div>
    <p style="text-align:center;">
      <a class="cta" href="{BASE_URL}/#/dashboard">Verify Email</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">
      This code expires in 24 hours. If you didn't create a Jobsy account,
      you can safely ignore this email.
    </p>
    """,
    )


def bid_accepted(bid: dict) -> str:
    """Your bid was accepted."""
    job_title = bid.get("job_title", "Job")
    job_id = bid.get("job_id", "")
    client_name = bid.get("client_name", "The client")
    amount = bid.get("amount", "")
    currency = bid.get("currency", "JMD")

    return _wrap(
        "Your Bid Was Accepted!",
        f"""
    <h2>Congratulations! Your Bid Was Accepted</h2>
    <p>
      <strong>{client_name}</strong> has accepted your bid for
      <strong>{job_title}</strong>.
    </p>

    <table class="detail-table">
      <tr><td class="label">Job</td><td class="value">{job_title}</td></tr>
      <tr><td class="label">Agreed Amount</td><td class="value">{currency} ${amount}</td></tr>
    </table>

    <p>The next step is to review and sign the contract.</p>
    <p><a class="cta" href="{BASE_URL}/#/job-board/{job_id}">View Job Details</a></p>
    """,
    )


def event_reminder(event: dict) -> str:
    """Event happening soon."""
    event_id = event.get("id", "")
    title = event.get("title", "Event")
    date = event.get("date", "")
    time = event.get("time", "")
    location = event.get("location", "")
    organizer = event.get("organizer", "")

    return _wrap(
        f"Reminder: {title}",
        f"""
    <h2>Your Event Is Coming Up!</h2>
    <p>
      Just a reminder that <strong>{title}</strong> is happening soon.
      Don't miss it!
    </p>

    <table class="detail-table">
      <tr><td class="label">Event</td><td class="value">{title}</td></tr>
      <tr><td class="label">Date</td><td class="value">{date}</td></tr>
      <tr><td class="label">Time</td><td class="value">{time}</td></tr>
      <tr><td class="label">Location</td><td class="value">{location}</td></tr>
      <tr><td class="label">Organizer</td><td class="value">{organizer}</td></tr>
    </table>

    <p><a class="cta" href="{BASE_URL}/#/events/{event_id}">View Event Details</a></p>
    <p style="font-size:13px;color:#6b7280;">
      Arrive a few minutes early to get the best experience.
    </p>
    """,
    )
