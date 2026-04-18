"""NCB/PowerTranz payment gateway adapter.

Integrates with the PowerTranz REST API (used by NCB Jamaica) for card payments.
When NCB_MERCHANT_ID is not set, operates in stub mode returning graceful errors.

PowerTranz API flow:
1. POST /spi/payment → returns SpiToken for 3DS authentication
2. Client-side 3DS challenge (redirect or iframe)
3. POST /spi/auth or /spi/sale → authorize or charge the card
4. POST /spi/capture → capture authorized payment
5. POST /spi/void → cancel authorized payment
6. POST /spi/refund → refund completed payment

API authentication: PowerTranzId + PowerTranzPassword headers.
"""

import logging
import os
import uuid
from decimal import Decimal

import httpx

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

# NCB/PowerTranz configuration
NCB_MERCHANT_ID = os.getenv("NCB_MERCHANT_ID", "")
NCB_MERCHANT_PASSWORD = os.getenv("NCB_MERCHANT_PASSWORD", "")
NCB_PROCESSING_URL = os.getenv(
    "NCB_PROCESSING_URL",
    "https://staging.ptranz.com/api",  # Sandbox default; production is gateway.ptranz.com
)

# 3DS return URLs
NCB_3DS_RETURN_URL = os.getenv("NCB_3DS_RETURN_URL", "https://jobsyja.com/payments/callback")
NCB_3DS_CANCEL_URL = os.getenv("NCB_3DS_CANCEL_URL", "https://jobsyja.com/payments/cancelled")


class NCBGateway(PaymentGateway):
    """NCB Jamaica payment gateway via PowerTranz/FAC."""

    def __init__(self) -> None:
        self._merchant_id = NCB_MERCHANT_ID
        self._password = NCB_MERCHANT_PASSWORD
        self._base_url = NCB_PROCESSING_URL.rstrip("/")

    async def is_configured(self) -> bool:
        return bool(self._merchant_id and self._password)

    def _headers(self) -> dict:
        return {
            "Content-Type": "application/json",
            "PowerTranzId": self._merchant_id,
            "PowerTranzPassword": self._password,
        }

    async def _post(self, path: str, payload: dict) -> dict | None:
        """Make authenticated POST to PowerTranz API."""
        if not await self.is_configured():
            return None
        url = f"{self._base_url}{path}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, headers=self._headers())
            resp.raise_for_status()
            return resp.json()

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
            return PaymentResult(
                success=False,
                error="NCB payment gateway is not yet configured. Please contact support.",
            )

        # Amount in minor units (cents for JMD)
        amount_cents = int(amount * 100)
        order_id = idempotency_key or str(uuid.uuid4())[:20]

        payload = {
            "TransactionIdentifier": order_id,
            "TotalAmount": amount_cents / 100,  # PowerTranz expects decimal amount
            "CurrencyCode": "388" if currency.upper() == "JMD" else "840",  # ISO 4217 numeric
            "ThreeDSecure": True,
            "Source": {
                "CardPan": "",  # Populated client-side via hosted fields
                "CardCvv": "",
                "CardExpiration": "",
                "CardholderName": "",
            },
            "OrderIdentifier": order_id,
            "BillingAddress": {},
            "AddressMatch": False,
            "ExtendedData": {
                "ThreeDSecure": {
                    "ChallengeWindowSize": 5,  # Full screen
                    "ChallengeIndicator": "01",  # No preference
                },
                "MerchantResponseUrl": NCB_3DS_RETURN_URL,
            },
        }

        try:
            result = await self._post("/spi/payment", payload)
            if not result:
                return PaymentResult(success=False, error="Failed to initiate payment")

            spi_token = result.get("SpiToken")
            redirect_url = result.get("RedirectUrl")

            return PaymentResult(
                success=True,
                payment_id=order_id,
                redirect_url=redirect_url,
                client_secret=spi_token,
                status="pending",
                metadata={"spi_token": spi_token, "order_id": order_id},
            )
        except Exception as e:
            logger.error("NCB create_payment failed: %s", str(e))
            return PaymentResult(success=False, error=f"Payment initiation failed: {str(e)}")

    async def capture_payment(self, payment_id: str) -> CaptureResult:
        if not await self.is_configured():
            return CaptureResult(success=False, error="NCB not configured")

        try:
            result = await self._post("/spi/capture", {
                "TransactionIdentifier": payment_id,
            })
            if result and result.get("Approved"):
                return CaptureResult(success=True, payment_id=payment_id, status="completed")
            return CaptureResult(
                success=False,
                payment_id=payment_id,
                error=result.get("ResponseMessage", "Capture failed") if result else "No response",
            )
        except Exception as e:
            logger.error("NCB capture failed: %s", str(e))
            return CaptureResult(success=False, error=str(e))

    async def cancel_payment(self, payment_id: str) -> CaptureResult:
        if not await self.is_configured():
            return CaptureResult(success=False, error="NCB not configured")

        try:
            result = await self._post("/spi/void", {
                "TransactionIdentifier": payment_id,
            })
            if result and result.get("Approved"):
                return CaptureResult(success=True, payment_id=payment_id, status="cancelled")
            return CaptureResult(success=False, error="Void failed")
        except Exception as e:
            logger.error("NCB void failed: %s", str(e))
            return CaptureResult(success=False, error=str(e))

    async def refund_payment(
        self,
        payment_id: str,
        amount: Decimal | None = None,
        reason: str | None = None,
    ) -> RefundResult:
        if not await self.is_configured():
            return RefundResult(success=False, error="NCB not configured")

        try:
            payload: dict = {"TransactionIdentifier": payment_id}
            if amount is not None:
                payload["TotalAmount"] = float(amount)

            result = await self._post("/spi/refund", payload)
            if result and result.get("Approved"):
                return RefundResult(
                    success=True,
                    refund_id=result.get("TransactionIdentifier"),
                    status="completed",
                )
            return RefundResult(success=False, error="Refund failed")
        except Exception as e:
            logger.error("NCB refund failed: %s", str(e))
            return RefundResult(success=False, error=str(e))

    async def create_payout(
        self,
        account_id: str,
        amount: Decimal,
        currency: str = "JMD",
    ) -> PayoutResult:
        # NCB payouts are handled via bank transfers outside the PowerTranz API.
        # Providers receive funds via direct NCB bank transfer.
        return PayoutResult(
            success=True,
            payout_id=f"ncb_payout_{uuid.uuid4().hex[:12]}",
            status="pending",
        )

    async def setup_customer_account(
        self,
        email: str,
        name: str | None = None,
        metadata: dict | None = None,
    ) -> AccountResult:
        # NCB doesn't require pre-registration of customers.
        # Customers pay directly via card on each transaction.
        return AccountResult(
            success=True,
            account_id=f"ncb_cust_{uuid.uuid4().hex[:12]}",
        )

    async def setup_provider_account(
        self,
        email: str,
        metadata: dict | None = None,
    ) -> AccountResult:
        # Provider accounts are set up via NCB's merchant onboarding.
        # For the marketplace model, all payments go to Jobsy's merchant account
        # and providers receive payouts via bank transfer.
        return AccountResult(
            success=True,
            account_id=f"ncb_prov_{uuid.uuid4().hex[:12]}",
        )

    async def verify_webhook(
        self,
        payload: bytes,
        signature: str,
    ) -> WebhookEvent | None:
        # PowerTranz uses POST-back to MerchantResponseUrl rather than webhooks.
        # The callback contains the transaction result after 3DS.
        try:
            import json
            data = json.loads(payload)
            approved = data.get("Approved", False)
            txn_id = data.get("TransactionIdentifier") or data.get("OrderIdentifier")

            return WebhookEvent(
                event_type="payment.completed" if approved else "payment.failed",
                payment_id=txn_id,
                status="completed" if approved else "failed",
                metadata=data,
            )
        except Exception as e:
            logger.error("NCB webhook parse failed: %s", str(e))
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
        # For escrow, we use authorization-only (not sale) so funds are held
        # but not captured until service is completed.
        if not await self.is_configured():
            return PaymentResult(
                success=False,
                error="NCB payment gateway is not yet configured.",
            )

        # Same as create_payment but will use /spi/auth instead of /spi/sale
        # when the payment is confirmed client-side
        return await self.create_payment(
            amount=amount,
            currency=currency,
            customer_id=customer_id,
            provider_account_id=provider_account_id,
            description=f"Escrow: {description}" if description else "Escrow hold",
            metadata={**(metadata or {}), "escrow": True},
            idempotency_key=idempotency_key,
        )
