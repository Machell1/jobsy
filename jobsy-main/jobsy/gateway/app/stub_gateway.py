"""Stub payment gateway for development/demo mode.

Used when no payment provider (NCB or Stripe) is configured.
Returns helpful messages indicating payments are being set up.
"""

import uuid
from decimal import Decimal

from .payment_gateway import (
    AccountResult,
    CaptureResult,
    PaymentGateway,
    PaymentResult,
    PayoutResult,
    RefundResult,
    WebhookEvent,
)


NOT_CONFIGURED_MSG = (
    "Online payments are being configured. "
    "Please arrange payment directly with your service provider."
)


class StubGateway(PaymentGateway):
    """Stub gateway that gracefully reports payments are not yet available."""

    async def is_configured(self) -> bool:
        return False

    async def create_payment(self, amount, currency, **kwargs) -> PaymentResult:
        return PaymentResult(success=False, error=NOT_CONFIGURED_MSG)

    async def capture_payment(self, payment_id) -> CaptureResult:
        return CaptureResult(success=False, error=NOT_CONFIGURED_MSG)

    async def cancel_payment(self, payment_id) -> CaptureResult:
        return CaptureResult(success=False, error=NOT_CONFIGURED_MSG)

    async def refund_payment(self, payment_id, amount=None, reason=None) -> RefundResult:
        return RefundResult(success=False, error=NOT_CONFIGURED_MSG)

    async def create_payout(self, account_id, amount, currency="JMD") -> PayoutResult:
        return PayoutResult(success=False, error=NOT_CONFIGURED_MSG)

    async def setup_customer_account(self, email, name=None, metadata=None) -> AccountResult:
        return AccountResult(
            success=True,
            account_id=f"stub_{uuid.uuid4().hex[:12]}",
        )

    async def setup_provider_account(self, email, metadata=None) -> AccountResult:
        return AccountResult(
            success=True,
            account_id=f"stub_{uuid.uuid4().hex[:12]}",
        )

    async def verify_webhook(self, payload, signature) -> WebhookEvent | None:
        return None

    async def create_escrow_payment(self, amount, currency, **kwargs) -> PaymentResult:
        return PaymentResult(success=False, error=NOT_CONFIGURED_MSG)
