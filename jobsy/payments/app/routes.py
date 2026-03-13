"""Payments service API routes -- transactions, accounts, webhooks, payouts."""

import os
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.events import publish_event

from .models import PaymentAccount, Payout, Refund, Transaction
from .stripe_client import (
    PLATFORM_FEE_PERCENT,
    create_connect_account,
    create_customer,
    create_payment_intent,
    create_payout,
    is_configured,
    verify_webhook_signature,
)

router = APIRouter(tags=["payments"])


def _get_user_id(request: Request) -> str:
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


# --- Account management ---


class AccountSetup(BaseModel):
    email: str
    name: str | None = None
    account_type: str = Field(default="customer", pattern=r"^(customer|provider)$")


@router.post("/accounts/setup")
async def setup_payment_account(
    data: AccountSetup,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Set up a payment account (customer or service provider).

    - Customers get a Stripe Customer for card payments
    - Providers get a Stripe Connect account for receiving payments
    """
    user_id = _get_user_id(request)

    # Check existing
    result = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == user_id))
    account = result.scalar_one_or_none()

    now = datetime.now(UTC)

    if not account:
        account = PaymentAccount(
            id=str(uuid.uuid4()),
            user_id=user_id,
            created_at=now,
            updated_at=now,
        )
        db.add(account)

    response = {"account_id": account.id, "user_id": user_id}

    if data.account_type == "customer":
        customer_id = await create_customer(data.email, data.name, {"user_id": user_id})
        if customer_id:
            account.stripe_customer_id = customer_id
        account.status = "active"
        response["stripe_customer_id"] = customer_id

    elif data.account_type == "provider":
        connect = await create_connect_account(data.email)
        if connect:
            account.stripe_account_id = connect["account_id"]
            response["onboarding_url"] = connect["onboarding_url"]
        account.status = "pending"

    account.updated_at = now
    await db.flush()

    return response


@router.get("/accounts/me")
async def get_my_account(request: Request, db: AsyncSession = Depends(get_db)):
    """Get current user's payment account details."""
    user_id = _get_user_id(request)
    result = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == user_id))
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment account not set up")

    return {
        "id": account.id,
        "status": account.status,
        "default_currency": account.default_currency,
        "has_customer": bool(account.stripe_customer_id),
        "has_connect": bool(account.stripe_account_id),
        "payout_method": account.payout_method,
        "created_at": account.created_at.isoformat(),
    }


# --- Transactions ---


class PaymentCreate(BaseModel):
    payee_id: str
    listing_id: str | None = None
    match_id: str | None = None
    amount: float = Field(..., gt=0)
    currency: str = Field(default="JMD", pattern=r"^[A-Z]{3}$")
    description: str | None = None


@router.post("/pay", status_code=status.HTTP_201_CREATED)
async def initiate_payment(
    data: PaymentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Initiate a payment for a service.

    Creates a Stripe PaymentIntent and records the transaction.
    Returns client_secret for frontend Stripe Elements confirmation.
    """
    payer_id = _get_user_id(request)

    if payer_id == data.payee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot pay yourself")

    amount = Decimal(str(data.amount))
    platform_fee = amount * PLATFORM_FEE_PERCENT / 100
    net_amount = amount - platform_fee

    # Look up Stripe IDs
    payer_result = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == payer_id))
    payer_account = payer_result.scalar_one_or_none()

    payee_result = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == data.payee_id))
    payee_account = payee_result.scalar_one_or_none()

    customer_id = payer_account.stripe_customer_id if payer_account else None
    connect_id = payee_account.stripe_account_id if payee_account else None

    # Create Stripe PaymentIntent
    intent = await create_payment_intent(
        amount_jmd=amount,
        customer_id=customer_id,
        connected_account_id=connect_id,
        description=data.description,
        metadata={"payer_id": payer_id, "payee_id": data.payee_id, "listing_id": data.listing_id or ""},
    )

    now = datetime.now(UTC)
    txn = Transaction(
        id=str(uuid.uuid4()),
        payer_id=payer_id,
        payee_id=data.payee_id,
        listing_id=data.listing_id,
        match_id=data.match_id,
        amount=amount,
        currency=data.currency,
        platform_fee=platform_fee,
        net_amount=net_amount,
        stripe_payment_intent_id=intent["payment_intent_id"] if intent else None,
        status="pending",
        description=data.description,
        created_at=now,
        updated_at=now,
    )
    db.add(txn)
    await db.flush()

    await publish_event("payment.created", {
        "transaction_id": txn.id,
        "payer_id": payer_id,
        "payee_id": data.payee_id,
        "amount": float(amount),
        "currency": data.currency,
    })

    return {
        "transaction_id": txn.id,
        "client_secret": intent["client_secret"] if intent else None,
        "amount": float(amount),
        "platform_fee": float(platform_fee),
        "net_amount": float(net_amount),
        "status": "pending",
    }


@router.get("/transactions")
async def list_transactions(
    request: Request,
    role: str = Query(default="all", pattern=r"^(all|payer|payee)$"),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List transactions for the current user."""
    user_id = _get_user_id(request)

    if role == "payer":
        condition = Transaction.payer_id == user_id
    elif role == "payee":
        condition = Transaction.payee_id == user_id
    else:
        condition = or_(Transaction.payer_id == user_id, Transaction.payee_id == user_id)

    query = (
        select(Transaction)
        .where(condition)
        .order_by(Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    txns = result.scalars().all()

    return [
        {
            "id": t.id,
            "payer_id": t.payer_id,
            "payee_id": t.payee_id,
            "amount": float(t.amount),
            "currency": t.currency,
            "platform_fee": float(t.platform_fee),
            "net_amount": float(t.net_amount),
            "status": t.status,
            "description": t.description,
            "created_at": t.created_at.isoformat(),
        }
        for t in txns
    ]


@router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Get transaction details."""
    user_id = _get_user_id(request)
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            or_(Transaction.payer_id == user_id, Transaction.payee_id == user_id),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    return {
        "id": txn.id,
        "payer_id": txn.payer_id,
        "payee_id": txn.payee_id,
        "amount": float(txn.amount),
        "currency": txn.currency,
        "platform_fee": float(txn.platform_fee),
        "net_amount": float(txn.net_amount),
        "status": txn.status,
        "description": txn.description,
        "listing_id": txn.listing_id,
        "match_id": txn.match_id,
        "created_at": txn.created_at.isoformat(),
        "updated_at": txn.updated_at.isoformat(),
    }


# --- Payouts ---


# --- Booking Payment ---


class BookingPaymentCreate(BaseModel):
    booking_id: str
    payee_id: str
    amount: float = Field(..., gt=0)
    currency: str = Field(default="JMD", pattern=r"^[A-Z]{3}$")
    description: str | None = None


@router.post("/booking-payment", status_code=status.HTTP_201_CREATED)
async def create_booking_payment(
    data: BookingPaymentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create a payment linked to a booking with platform fee."""
    payer_id = _get_user_id(request)

    if payer_id == data.payee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot pay yourself")

    amount = Decimal(str(data.amount))
    platform_fee = amount * PLATFORM_FEE_PERCENT / 100
    net_amount = amount - platform_fee

    payer_result = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == payer_id))
    payer_account = payer_result.scalar_one_or_none()

    payee_result = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == data.payee_id))
    payee_account = payee_result.scalar_one_or_none()

    customer_id = payer_account.stripe_customer_id if payer_account else None
    connect_id = payee_account.stripe_account_id if payee_account else None

    intent = await create_payment_intent(
        amount_jmd=amount,
        customer_id=customer_id,
        connected_account_id=connect_id,
        description=data.description or f"Booking {data.booking_id}",
        metadata={
            "payer_id": payer_id,
            "payee_id": data.payee_id,
            "booking_id": data.booking_id,
        },
    )

    now = datetime.now(UTC)
    txn = Transaction(
        id=str(uuid.uuid4()),
        payer_id=payer_id,
        payee_id=data.payee_id,
        booking_id=data.booking_id,
        amount=amount,
        currency=data.currency,
        platform_fee=platform_fee,
        net_amount=net_amount,
        provider_payout=net_amount,
        stripe_payment_intent_id=intent["payment_intent_id"] if intent else None,
        status="pending",
        description=data.description,
        created_at=now,
        updated_at=now,
    )
    db.add(txn)
    await db.flush()

    await publish_event("payment.booking_created", {
        "transaction_id": txn.id,
        "booking_id": data.booking_id,
        "payer_id": payer_id,
        "payee_id": data.payee_id,
        "amount": float(amount),
        "platform_fee": float(platform_fee),
    })

    return {
        "transaction_id": txn.id,
        "booking_id": data.booking_id,
        "client_secret": intent["client_secret"] if intent else None,
        "amount": float(amount),
        "platform_fee": float(platform_fee),
        "provider_payout": float(net_amount),
        "status": "pending",
    }


# --- Refunds ---


class RefundCreate(BaseModel):
    payment_id: str
    booking_id: str | None = None
    amount: float | None = None  # None = full refund
    reason: str | None = None


@router.post("/refunds", status_code=status.HTTP_201_CREATED)
async def create_refund(
    data: RefundCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Process a full or partial refund against a payment."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(Transaction).where(
            Transaction.id == data.payment_id,
            or_(Transaction.payer_id == user_id, Transaction.payee_id == user_id),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    if txn.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only refund completed payments")

    refund_amount = Decimal(str(data.amount)) if data.amount else txn.amount

    if refund_amount > txn.amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Refund exceeds payment amount")

    now = datetime.now(UTC)
    refund = Refund(
        id=str(uuid.uuid4()),
        payment_id=data.payment_id,
        booking_id=data.booking_id or txn.booking_id,
        amount=refund_amount,
        currency=txn.currency,
        reason=data.reason,
        status="processing",
        initiated_by=user_id,
        created_at=now,
    )
    db.add(refund)

    txn.status = "refunded"
    txn.updated_at = now
    await db.flush()

    await publish_event("payment.refunded", {
        "refund_id": refund.id,
        "transaction_id": txn.id,
        "amount": float(refund_amount),
    })

    return {
        "refund_id": refund.id,
        "payment_id": data.payment_id,
        "amount": float(refund_amount),
        "status": "processing",
    }


# --- Receipts & Invoices ---


@router.get("/receipts/{payment_id}")
async def get_receipt(payment_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Generate receipt data for a completed payment."""
    user_id = _get_user_id(request)
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == payment_id,
            or_(Transaction.payer_id == user_id, Transaction.payee_id == user_id),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    return {
        "receipt_id": txn.id,
        "payer_id": txn.payer_id,
        "payee_id": txn.payee_id,
        "amount": float(txn.amount),
        "currency": txn.currency,
        "platform_fee": float(txn.platform_fee) if txn.platform_fee else 0,
        "net_amount": float(txn.net_amount),
        "status": txn.status,
        "description": txn.description,
        "booking_id": txn.booking_id,
        "created_at": txn.created_at.isoformat(),
    }


@router.get("/invoices/{booking_id}")
async def get_invoice(booking_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Generate invoice data for a booking."""
    user_id = _get_user_id(request)
    result = await db.execute(
        select(Transaction).where(
            Transaction.booking_id == booking_id,
            or_(Transaction.payer_id == user_id, Transaction.payee_id == user_id),
        )
    )
    txns = result.scalars().all()
    if not txns:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No payments found for booking")

    total = sum(float(t.amount) for t in txns)
    total_fees = sum(float(t.platform_fee) if t.platform_fee else 0 for t in txns)

    return {
        "booking_id": booking_id,
        "total_amount": total,
        "total_platform_fees": total_fees,
        "total_provider_payout": total - total_fees,
        "currency": txns[0].currency,
        "payments": [
            {
                "id": t.id,
                "amount": float(t.amount),
                "platform_fee": float(t.platform_fee) if t.platform_fee else 0,
                "status": t.status,
                "created_at": t.created_at.isoformat(),
            }
            for t in txns
        ],
    }


# --- Payouts ---


class PayoutRequest(BaseModel):
    amount: float = Field(..., gt=0)


@router.post("/payouts", status_code=status.HTTP_201_CREATED)
async def request_payout(data: PayoutRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Request a payout of earned funds to the provider's bank."""
    user_id = _get_user_id(request)

    account_result = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == user_id))
    account = account_result.scalar_one_or_none()

    if not account or not account.stripe_account_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No Connect account set up")

    amount = Decimal(str(data.amount))
    stripe_payout = await create_payout(account.stripe_account_id, amount)

    now = datetime.now(UTC)
    payout = Payout(
        id=str(uuid.uuid4()),
        user_id=user_id,
        amount=amount,
        stripe_payout_id=stripe_payout["payout_id"] if stripe_payout else None,
        status="processing" if stripe_payout else "pending",
        requested_at=now,
    )
    db.add(payout)
    await db.flush()

    return {
        "payout_id": payout.id,
        "amount": float(amount),
        "status": payout.status,
    }


@router.get("/payouts")
async def list_payouts(
    request: Request,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List payout history."""
    user_id = _get_user_id(request)
    query = (
        select(Payout)
        .where(Payout.user_id == user_id)
        .order_by(Payout.requested_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    payouts = result.scalars().all()

    return [
        {
            "id": p.id,
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status,
            "requested_at": p.requested_at.isoformat(),
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        }
        for p in payouts
    ]


# --- Stripe Webhook ---


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="Stripe-Signature", default=""),
    db: AsyncSession = Depends(get_db),
):
    """Handle Stripe webhook events.

    Processes: payment_intent.succeeded, payment_intent.payment_failed,
    payout.paid, payout.failed, account.updated
    """
    body = await request.body()
    event = verify_webhook_signature(body, stripe_signature)

    if not event:
        if not is_configured():
            if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PRODUCTION"):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Stripe not configured in production",
                )
            return {"status": "skipped", "reason": "stripe not configured"}
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")

    event_type = event["type"]
    data = event["data"]["object"]

    now = datetime.now(UTC)

    if event_type == "payment_intent.succeeded":
        pi_id = data["id"]
        result = await db.execute(
            select(Transaction).where(Transaction.stripe_payment_intent_id == pi_id)
        )
        txn = result.scalar_one_or_none()
        if txn:
            txn.status = "completed"
            txn.updated_at = now
            await db.flush()
            await publish_event("payment.completed", {
                "transaction_id": txn.id,
                "payer_id": txn.payer_id,
                "payee_id": txn.payee_id,
                "amount": float(txn.amount),
            })

    elif event_type == "payment_intent.payment_failed":
        pi_id = data["id"]
        result = await db.execute(
            select(Transaction).where(Transaction.stripe_payment_intent_id == pi_id)
        )
        txn = result.scalar_one_or_none()
        if txn:
            txn.status = "failed"
            txn.updated_at = now
            await db.flush()

    elif event_type == "payout.paid":
        payout_id = data["id"]
        result = await db.execute(
            select(Payout).where(Payout.stripe_payout_id == payout_id)
        )
        payout = result.scalar_one_or_none()
        if payout:
            payout.status = "completed"
            payout.completed_at = now
            await db.flush()

    elif event_type == "payout.failed":
        payout_id = data["id"]
        result = await db.execute(
            select(Payout).where(Payout.stripe_payout_id == payout_id)
        )
        payout = result.scalar_one_or_none()
        if payout:
            payout.status = "failed"
            await db.flush()

    return {"status": "processed", "type": event_type}
