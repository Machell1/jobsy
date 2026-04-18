"""Stripe payment gateway adapter.

Wraps existing Stripe integration into the PaymentGateway interface
for compatibility during the NCB migration.
"""

import logging
import os
import uuid
from decimal import Decimal

import stripe

from .payment_gateway import (
    AccountResult,
    CaptureResult,
    PaymentGateway,
    PaymentResult,
    PayoutResult,
    RefundResult,
    WebhookEvent,
)

logger = logging.getLogger(__name__)

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

stripe.api_key = STRIPE_SECRET_KEY


class StripeGateway(PaymentGateway):
    """Stripe payment gateway (legacy, for backwards compatibility)."""

    async def is_configured(self) -> bool:
        return bool(STRIPE_SECRET_KEY)

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
        if not await self.is_configured():
            return PaymentResult(success=False, error="Stripe not configured")

        cents = int(amount * 100)
        fee_cents = int(self.get_platform_fee(amount) * 100)

        params: dict = {
            "amount": cents,
            "currency": currency.lower(),
            "description": description,
            "metadata": metadata or {},
        }
        if customer_id:
            params["customer"] = customer_id
        if provider_account_id:
            params["transfer_data"] = {"destination": provider_account_id}
            params["application_fee_amount"] = fee_cents
        if idempotency_key:
            params["idempotency_key"] = f"pay_{idempotency_key}"

        try:
            intent = stripe.PaymentIntent.create(**params)
            return PaymentResult(
                success=True,
                payment_id=intent.id,
                client_secret=intent.client_secret,
                status="pending",
            )
        except stripe.error.StripeError as e:
            return PaymentResult(success=False, error=str(e))

    async def capture_payment(self, payment_id: str) -> CaptureResult:
        if not await self.is_configured():
            return CaptureResult(success=False, error="Stripe not configured")
        try:
            stripe.PaymentIntent.capture(payment_id)
            return CaptureResult(success=True, payment_id=payment_id, status="completed")
        except stripe.error.StripeError as e:
            return CaptureResult(success=False, error=str(e))

    async def cancel_payment(self, payment_id: str) -> CaptureResult:
        if not await self.is_configured():
            return CaptureResult(success=False, error="Stripe not configured")
        try:
            stripe.PaymentIntent.cancel(payment_id)
            return CaptureResult(success=True, payment_id=payment_id, status="cancelled")
        except stripe.error.StripeError as e:
            return CaptureResult(success=False, error=str(e))

    async def refund_payment(
        self,
        payment_id: str,
        amount: Decimal | None = None,
        reason: str | None = None,
    ) -> RefundResult:
        if not await self.is_configured():
            return RefundResult(success=False, error="Stripe not configured")
        try:
            params: dict = {"payment_intent": payment_id}
            if amount:
                params["amount"] = int(amount * 100)
            if reason:
                params["reason"] = "requested_by_customer"
            refund = stripe.Refund.create(**params)
            return RefundResult(success=True, refund_id=refund.id, status=refund.status)
        except stripe.error.StripeError as e:
            return RefundResult(success=False, error=str(e))

    async def create_payout(
        self,
        account_id: str,
        amount: Decimal,
        currency: str = "JMD",
    ) -> PayoutResult:
        if not await self.is_configured():
            return PayoutResult(success=False, error="Stripe not configured")
        try:
            p = stripe.Payout.create(
                amount=int(amount * 100),
                currency=currency.lower(),
                stripe_account=account_id,
            )
            return PayoutResult(success=True, payout_id=p.id, status=p.status)
        except stripe.error.StripeError as e:
            return PayoutResult(success=False, error=str(e))

    async def setup_customer_account(
        self,
        email: str,
        name: str | None = None,
        metadata: dict | None = None,
    ) -> AccountResult:
        if not await self.is_configured():
            return AccountResult(success=False, error="Stripe not configured")
        try:
            c = stripe.Customer.create(email=email, name=name, metadata=metadata or {})
            return AccountResult(success=True, account_id=c.id)
        except stripe.error.StripeError as e:
            return AccountResult(success=False, error=str(e))

    async def setup_provider_account(
        self,
        email: str,
        metadata: dict | None = None,
    ) -> AccountResult:
        if not await self.is_configured():
            return AccountResult(success=False, error="Stripe not configured")
        try:
            acct = stripe.Account.create(
                type="express", country="JM", email=email,
                capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}},
            )
            link = stripe.AccountLink.create(
                account=acct.id,
                refresh_url=os.getenv("STRIPE_REFRESH_URL", "https://jobsyja.com/payments"),
                return_url=os.getenv("STRIPE_RETURN_URL", "https://jobsyja.com/payments"),
                type="account_onboarding",
            )
            return AccountResult(success=True, account_id=acct.id, onboarding_url=link.url)
        except stripe.error.StripeError as e:
            return AccountResult(success=False, error=str(e))

    async def verify_webhook(
        self,
        payload: bytes,
        signature: str,
    ) -> WebhookEvent | None:
        if not STRIPE_WEBHOOK_SECRET:
            return None
        try:
            event = stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
            etype = event["type"]
            data = event["data"]["object"]

            event_map = {
                "payment_intent.succeeded": ("payment.completed", "completed"),
                "payment_intent.payment_failed": ("payment.failed", "failed"),
                "payout.paid": ("payout.completed", "completed"),
                "payout.failed": ("payout.failed", "failed"),
            }

            if etype in event_map:
                mapped_type, status = event_map[etype]
                return WebhookEvent(
                    event_type=mapped_type,
                    payment_id=data.get("id"),
                    status=status,
                    metadata=data.get("metadata"),
                )
            return WebhookEvent(event_type=etype, metadata={"raw": data})
        except (stripe.error.SignatureVerificationError, ValueError):
            logger.warning("Invalid Stripe webhook signature")
            return None

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
        if not await self.is_configured():
            return PaymentResult(success=False, error="Stripe not configured")

        cents = int(amount * 100)
        fee_cents = int(self.get_platform_fee(amount) * 100)

        params: dict = {
            "amount": cents,
            "currency": currency.lower(),
            "capture_method": "manual",
            "description": description,
            "metadata": metadata or {},
        }
        if customer_id:
            params["customer"] = customer_id
        if provider_account_id:
            params["transfer_data"] = {"destination": provider_account_id}
            params["application_fee_amount"] = fee_cents
        if idempotency_key:
            params["idempotency_key"] = f"escrow_{idempotency_key}"

        try:
            intent = stripe.PaymentIntent.create(**params)
            return PaymentResult(
                success=True,
                payment_id=intent.id,
                client_secret=intent.client_secret,
                status="pending",
            )
        except stripe.error.StripeError as e:
            return PaymentResult(success=False, error=str(e))
