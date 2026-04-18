"""Payment gateway abstraction layer.

Provides a unified interface for payment processing that can be backed by
different providers (NCB/PowerTranz, Stripe, or a stub for development).

Usage:
    from .payment_gateway import get_gateway
    gw = get_gateway()
    result = await gw.create_payment(amount, currency, ...)
"""

import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


@dataclass
class PaymentResult:
    """Result of initiating a payment."""
    success: bool
    payment_id: str | None = None
    client_secret: str | None = None  # For client-side confirmation (Stripe/NCB 3DS)
    redirect_url: str | None = None   # For 3DS redirect flow (NCB/PowerTranz)
    status: str = "pending"
    error: str | None = None
    metadata: dict | None = None


@dataclass
class CaptureResult:
    success: bool
    payment_id: str | None = None
    status: str = "completed"
    error: str | None = None


@dataclass
class RefundResult:
    success: bool
    refund_id: str | None = None
    status: str = "processing"
    error: str | None = None


@dataclass
class PayoutResult:
    success: bool
    payout_id: str | None = None
    status: str = "processing"
    error: str | None = None


@dataclass
class AccountResult:
    success: bool
    account_id: str | None = None
    onboarding_url: str | None = None
    error: str | None = None


@dataclass
class WebhookEvent:
    event_type: str
    payment_id: str | None = None
    status: str | None = None
    metadata: dict | None = None


class PaymentGateway(ABC):
    """Abstract payment gateway interface."""

    @abstractmethod
    async def is_configured(self) -> bool:
        """Check if the gateway has valid credentials."""
        ...

    @abstractmethod
    async def create_payment(
        self,
        amount: Decimal,
        currency: str,
        customer_id: str | None = None,
        provider_account_id: str | None = None,
        description: str | None = None,
        metadata: dict | None = None,
        idempotency_key: str | None = None,
    ) -> PaymentResult:
        """Initiate a payment."""
        ...

    @abstractmethod
    async def capture_payment(self, payment_id: str) -> CaptureResult:
        """Capture a previously authorized payment (for escrow flows)."""
        ...

    @abstractmethod
    async def cancel_payment(self, payment_id: str) -> CaptureResult:
        """Cancel/void an authorized payment."""
        ...

    @abstractmethod
    async def refund_payment(
        self,
        payment_id: str,
        amount: Decimal | None = None,
        reason: str | None = None,
    ) -> RefundResult:
        """Refund a completed payment (full or partial)."""
        ...

    @abstractmethod
    async def create_payout(
        self,
        account_id: str,
        amount: Decimal,
        currency: str = "JMD",
    ) -> PayoutResult:
        """Transfer funds to a provider's bank account."""
        ...

    @abstractmethod
    async def setup_customer_account(
        self,
        email: str,
        name: str | None = None,
        metadata: dict | None = None,
    ) -> AccountResult:
        """Create a customer payment account."""
        ...

    @abstractmethod
    async def setup_provider_account(
        self,
        email: str,
        metadata: dict | None = None,
    ) -> AccountResult:
        """Create a provider account for receiving payments."""
        ...

    @abstractmethod
    async def verify_webhook(
        self,
        payload: bytes,
        signature: str,
    ) -> WebhookEvent | None:
        """Verify and parse an incoming webhook."""
        ...

    @abstractmethod
    async def create_escrow_payment(
        self,
        amount: Decimal,
        currency: str,
        customer_id: str | None = None,
        provider_account_id: str | None = None,
        description: str | None = None,
        metadata: dict | None = None,
        idempotency_key: str | None = None,
    ) -> PaymentResult:
        """Create an escrow/manual-capture payment hold."""
        ...

    def get_platform_fee(self, amount: Decimal) -> Decimal:
        """Calculate platform fee for a given amount."""
        fee_percent = Decimal(os.getenv("PLATFORM_FEE_PERCENT", "5"))
        return amount * fee_percent / 100

    def get_net_amount(self, amount: Decimal) -> Decimal:
        """Calculate net amount after platform fee."""
        return amount - self.get_platform_fee(amount)


# ---------------------------------------------------------------------------
# Gateway registry
# ---------------------------------------------------------------------------

_gateway_instance: PaymentGateway | None = None


def get_gateway() -> PaymentGateway:
    """Get the configured payment gateway instance.

    Returns NCB gateway if NCB_MERCHANT_ID is set,
    falls back to Stripe if STRIPE_SECRET_KEY is set,
    otherwise returns a stub gateway.
    """
    global _gateway_instance
    if _gateway_instance is not None:
        return _gateway_instance

    gateway_type = os.getenv("PAYMENT_GATEWAY", "auto").lower()

    if gateway_type == "ncb" or (gateway_type == "auto" and os.getenv("NCB_MERCHANT_ID")):
        from .ncb_gateway import NCBGateway
        _gateway_instance = NCBGateway()
        logger.info("Payment gateway: NCB/PowerTranz")
    elif gateway_type == "stripe" or (gateway_type == "auto" and os.getenv("STRIPE_SECRET_KEY")):
        from .stripe_gateway import StripeGateway
        _gateway_instance = StripeGateway()
        logger.info("Payment gateway: Stripe")
    else:
        from .stub_gateway import StubGateway
        _gateway_instance = StubGateway()
        logger.info("Payment gateway: Stub (no provider configured)")

    return _gateway_instance


def reset_gateway() -> None:
    """Reset the gateway instance (for testing)."""
    global _gateway_instance
    _gateway_instance = None
