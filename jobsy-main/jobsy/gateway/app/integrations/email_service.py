"""Email service with Resend (primary) and SendGrid (fallback)."""

import logging

import httpx

from shared.config import RESEND_API_KEY, SENDGRID_API_KEY

logger = logging.getLogger(__name__)


async def _send_via_resend(to: str, subject: str, html: str) -> bool:
    """Send email using Resend API."""
    if not RESEND_API_KEY:
        return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                json={
                    "from": "Jobsy <noreply@jobsyja.com>",
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
                timeout=10,
            )
            if resp.status_code in (200, 201):
                return True
            logger.error("Resend returned status %s: %s", resp.status_code, resp.text)
    except Exception:
        logger.exception("Resend email failed")
    return False


async def _send_via_sendgrid(to: str, subject: str, html: str) -> bool:
    """Send email using SendGrid API."""
    if not SENDGRID_API_KEY:
        return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "personalizations": [{"to": [{"email": to}]}],
                    "from": {"email": "noreply@jobsyja.com", "name": "Jobsy"},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": html}],
                },
                timeout=10,
            )
            # SendGrid returns 202 on success
            if resp.status_code in (200, 201, 202):
                return True
            logger.error("SendGrid returned status %s: %s", resp.status_code, resp.text)
    except Exception:
        logger.exception("SendGrid email failed")
    return False


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email using Resend (primary) with SendGrid fallback.

    Returns True if the email was sent successfully.
    """
    if not RESEND_API_KEY and not SENDGRID_API_KEY:
        logger.warning("No email provider configured (RESEND_API_KEY / SENDGRID_API_KEY)")
        return False

    if await _send_via_resend(to, subject, html):
        return True

    logger.info("Resend failed or unavailable, trying SendGrid fallback")
    return await _send_via_sendgrid(to, subject, html)
