"""Contact form route for the gateway."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from ..integrations.email_service import send_email

logger = logging.getLogger(__name__)

router = APIRouter(tags=["contact"])

SUPPORT_EMAIL = "support@jobsyja.com"


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=300)
    message: str = Field(..., min_length=10, max_length=5000)


@router.post("/contact", status_code=200)
async def submit_contact_form(data: ContactRequest):
    """Receive a contact form submission and email it to support."""
    html = (
        f"<h2>New Contact Form Submission</h2>"
        f"<p><strong>Name:</strong> {data.name}</p>"
        f"<p><strong>Email:</strong> {data.email}</p>"
        f"<p><strong>Subject:</strong> {data.subject}</p>"
        f"<hr/>"
        f"<p>{data.message}</p>"
    )

    sent = await send_email(
        to=SUPPORT_EMAIL,
        subject=f"[Jobsy Contact] {data.subject}",
        html=html,
    )

    if not sent:
        logger.warning(
            "Contact form email could not be sent (no email provider configured). "
            "From: %s <%s>, Subject: %s",
            data.name,
            data.email,
            data.subject,
        )
        # Still return success -- the message is logged even if email fails
        return {"status": "received", "message": "Your message has been received. We will get back to you soon."}

    return {"status": "sent", "message": "Your message has been sent. We will get back to you within 24 hours."}
