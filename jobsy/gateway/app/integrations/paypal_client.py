"""PayPal payment integration."""

import logging

import paypalrestsdk

from shared.config import PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE

logger = logging.getLogger(__name__)

_configured = False

if PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET:
    paypalrestsdk.configure({
        "mode": PAYPAL_MODE,
        "client_id": PAYPAL_CLIENT_ID,
        "client_secret": PAYPAL_CLIENT_SECRET,
    })
    _configured = True
else:
    logger.warning("PayPal credentials not set, PayPal payments will be unavailable")


def paypal_ok() -> bool:
    """Return True if PayPal is configured."""
    return _configured


def create_payment(
    amount: str,
    currency: str,
    description: str,
    return_url: str,
    cancel_url: str,
) -> dict | None:
    """Create a PayPal payment and return approval URL + payment ID."""
    if not _configured:
        return None
    payment = paypalrestsdk.Payment({
        "intent": "sale",
        "payer": {"payment_method": "paypal"},
        "redirect_urls": {"return_url": return_url, "cancel_url": cancel_url},
        "transactions": [{
            "amount": {"total": amount, "currency": currency},
            "description": description,
        }],
    })
    if payment.create():
        approval_url = next(
            (link.href for link in payment.links if link.rel == "approval_url"),
            None,
        )
        return {"payment_id": payment.id, "approval_url": approval_url}
    logger.error("PayPal payment creation failed: %s", payment.error)
    return None


def execute_payment(payment_id: str, payer_id: str) -> dict | None:
    """Execute an approved PayPal payment."""
    if not _configured:
        return None
    payment = paypalrestsdk.Payment.find(payment_id)
    if payment.execute({"payer_id": payer_id}):
        return {"payment_id": payment.id, "state": payment.state}
    logger.error("PayPal payment execution failed: %s", payment.error)
    return None
