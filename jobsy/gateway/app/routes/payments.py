"""Payments routes embedded in the gateway.

Handles account setup, payments, transactions, payouts, refunds, receipts.
Stripe integration is optional -- works without keys in dev/test mode.
"""

import logging
import os
import uuid
from datetime import UTC, datetime
from decimal import Decimal

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..deps import get_current_user
from ..models_payments import PaymentAccount, Payout, Refund, Transaction

logger = logging.getLogger(__name__)

router = APIRouter(tags=["payments"])

# ---------------------------------------------------------------------------
# Stripe config
# ---------------------------------------------------------------------------
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
PLATFORM_FEE_PERCENT = Decimal(os.getenv("PLATFORM_FEE_PERCENT", "10"))

stripe.api_key = STRIPE_SECRET_KEY


def _stripe_ok() -> bool:
    return bool(STRIPE_SECRET_KEY)


async def _create_customer(email: str, name: str | None, metadata: dict | None) -> str | None:
    if not _stripe_ok():
        return None
    c = stripe.Customer.create(email=email, name=name, metadata=metadata or {})
    return c.id


async def _create_connect(email: str) -> dict | None:
    if not _stripe_ok():
        return None
    acct = stripe.Account.create(
        type="express", country="JM", email=email,
        capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}},
    )
    link = stripe.AccountLink.create(
        account=acct.id,
        refresh_url=os.getenv("STRIPE_REFRESH_URL", "https://jobsyja.com/#/payments"),
        return_url=os.getenv("STRIPE_RETURN_URL", "https://jobsyja.com/#/payments"),
        type="account_onboarding",
    )
    return {"account_id": acct.id, "onboarding_url": link.url}


async def _create_intent(
    amount: Decimal, customer_id: str | None, connect_id: str | None,
    desc: str | None, meta: dict | None,
) -> dict | None:
    if not _stripe_ok():
        return None
    cents = int(amount * 100)
    fee_cents = int(amount * PLATFORM_FEE_PERCENT / 100 * 100)
    params: dict = {"amount": cents, "currency": "jmd", "description": desc, "metadata": meta or {}}
    if customer_id:
        params["customer"] = customer_id
    if connect_id:
        params["transfer_data"] = {"destination": connect_id}
        params["application_fee_amount"] = fee_cents
    intent = stripe.PaymentIntent.create(**params)
    return {"payment_intent_id": intent.id, "client_secret": intent.client_secret}


async def _create_payout(account_id: str, amount: Decimal) -> dict | None:
    if not _stripe_ok():
        return None
    p = stripe.Payout.create(amount=int(amount * 100), currency="jmd", stripe_account=account_id)
    return {"payout_id": p.id, "status": p.status}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AccountSetup(BaseModel):
    email: str
    name: str | None = None
    account_type: str = Field(default="customer", pattern=r"^(customer|provider)$")


class PaymentCreate(BaseModel):
    payee_id: str
    listing_id: str | None = None
    match_id: str | None = None
    booking_id: str | None = None
    amount: float = Field(..., gt=0)
    currency: str = Field(default="JMD", pattern=r"^[A-Z]{3}$")
    description: str | None = None


class PayoutRequest(BaseModel):
    amount: float = Field(..., gt=0)


class RefundCreate(BaseModel):
    payment_id: str
    booking_id: str | None = None
    amount: float | None = None
    reason: str | None = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/accounts/setup")
async def setup_payment_account(
    data: AccountSetup,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user["user_id"]
    result = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == uid))
    account = result.scalar_one_or_none()
    now = datetime.now(UTC)

    if not account:
        account = PaymentAccount(id=str(uuid.uuid4()), user_id=uid, created_at=now, updated_at=now)
        db.add(account)

    resp: dict = {"account_id": account.id, "user_id": uid}

    if data.account_type == "customer":
        cid = await _create_customer(data.email, data.name, {"user_id": uid})
        if cid:
            account.stripe_customer_id = cid
        account.status = "active"
        resp["stripe_customer_id"] = cid

    elif data.account_type == "provider":
        connect = await _create_connect(data.email)
        if connect:
            account.stripe_account_id = connect["account_id"]
            resp["onboarding_url"] = connect["onboarding_url"]
        account.status = "pending"

    account.updated_at = now
    await db.flush()
    return resp


@router.get("/accounts/me")
async def get_my_account(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user["user_id"]
    result = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == uid))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Payment account not set up")
    return {
        "id": account.id,
        "status": account.status,
        "default_currency": account.default_currency,
        "has_customer": bool(account.stripe_customer_id),
        "has_connect": bool(account.stripe_account_id),
        "payout_method": account.payout_method,
        "created_at": account.created_at.isoformat(),
    }


@router.post("/pay", status_code=201)
async def initiate_payment(
    data: PaymentCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payer_id = user["user_id"]
    if payer_id == data.payee_id:
        raise HTTPException(status_code=400, detail="Cannot pay yourself")

    amount = Decimal(str(data.amount))
    fee = amount * PLATFORM_FEE_PERCENT / 100
    net = amount - fee

    payer_r = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == payer_id))
    payer_acc = payer_r.scalar_one_or_none()
    payee_r = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == data.payee_id))
    payee_acc = payee_r.scalar_one_or_none()

    customer_id = payer_acc.stripe_customer_id if payer_acc else None
    connect_id = payee_acc.stripe_account_id if payee_acc else None

    meta = {"payer_id": payer_id, "payee_id": data.payee_id}
    intent = await _create_intent(
        amount, customer_id, connect_id, data.description, meta,
    )

    now = datetime.now(UTC)
    txn = Transaction(
        id=str(uuid.uuid4()), payer_id=payer_id, payee_id=data.payee_id,
        listing_id=data.listing_id, match_id=data.match_id, booking_id=data.booking_id,
        amount=amount, currency=data.currency, platform_fee=fee, net_amount=net,
        provider_payout=net,
        stripe_payment_intent_id=intent["payment_intent_id"] if intent else None,
        status="pending", description=data.description, created_at=now, updated_at=now,
    )
    db.add(txn)
    await db.flush()

    return {
        "transaction_id": txn.id,
        "client_secret": intent["client_secret"] if intent else None,
        "amount": float(amount),
        "platform_fee": float(fee),
        "net_amount": float(net),
        "status": "pending",
    }


@router.get("/transactions")
async def list_transactions(
    user: dict = Depends(get_current_user),
    role: str = Query(default="all", pattern=r"^(all|payer|payee)$"),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    uid = user["user_id"]
    if role == "payer":
        cond = Transaction.payer_id == uid
    elif role == "payee":
        cond = Transaction.payee_id == uid
    else:
        cond = or_(Transaction.payer_id == uid, Transaction.payee_id == uid)

    q = select(Transaction).where(cond).order_by(Transaction.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    txns = result.scalars().all()

    return [
        {
            "id": t.id, "payer_id": t.payer_id, "payee_id": t.payee_id,
            "amount": float(t.amount), "currency": t.currency,
            "platform_fee": float(t.platform_fee), "net_amount": float(t.net_amount),
            "status": t.status, "description": t.description,
            "booking_id": t.booking_id, "listing_id": t.listing_id,
            "created_at": t.created_at.isoformat(),
        }
        for t in txns
    ]


@router.get("/transactions/{txn_id}")
async def get_transaction(
    txn_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user["user_id"]
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == txn_id,
            or_(Transaction.payer_id == uid, Transaction.payee_id == uid),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {
        "id": txn.id, "payer_id": txn.payer_id, "payee_id": txn.payee_id,
        "amount": float(txn.amount), "currency": txn.currency,
        "platform_fee": float(txn.platform_fee), "net_amount": float(txn.net_amount),
        "status": txn.status, "description": txn.description,
        "booking_id": txn.booking_id, "listing_id": txn.listing_id,
        "created_at": txn.created_at.isoformat(),
        "updated_at": txn.updated_at.isoformat(),
    }


@router.get("/receipts/{payment_id}")
async def get_receipt(
    payment_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user["user_id"]
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == payment_id,
            or_(Transaction.payer_id == uid, Transaction.payee_id == uid),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {
        "receipt_id": txn.id, "payer_id": txn.payer_id, "payee_id": txn.payee_id,
        "amount": float(txn.amount), "currency": txn.currency,
        "platform_fee": float(txn.platform_fee) if txn.platform_fee else 0,
        "net_amount": float(txn.net_amount), "status": txn.status,
        "description": txn.description, "booking_id": txn.booking_id,
        "created_at": txn.created_at.isoformat(),
    }


@router.post("/payouts", status_code=201)
async def request_payout(
    data: PayoutRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user["user_id"]
    acc_r = await db.execute(select(PaymentAccount).where(PaymentAccount.user_id == uid))
    acc = acc_r.scalar_one_or_none()
    if not acc or not acc.stripe_account_id:
        raise HTTPException(status_code=400, detail="No Connect account set up")

    amount = Decimal(str(data.amount))
    sp = await _create_payout(acc.stripe_account_id, amount)

    now = datetime.now(UTC)
    po = Payout(
        id=str(uuid.uuid4()), user_id=uid, amount=amount,
        stripe_payout_id=sp["payout_id"] if sp else None,
        status="processing" if sp else "pending", requested_at=now,
    )
    db.add(po)
    await db.flush()
    return {"payout_id": po.id, "amount": float(amount), "status": po.status}


@router.get("/payouts")
async def list_payouts(
    user: dict = Depends(get_current_user),
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    uid = user["user_id"]
    q = select(Payout).where(Payout.user_id == uid).order_by(Payout.requested_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return [
        {
            "id": p.id, "amount": float(p.amount), "currency": p.currency,
            "status": p.status, "requested_at": p.requested_at.isoformat(),
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        }
        for p in result.scalars().all()
    ]


@router.post("/refunds", status_code=201)
async def create_refund(
    data: RefundCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user["user_id"]
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == data.payment_id,
            or_(Transaction.payer_id == uid, Transaction.payee_id == uid),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.status != "completed":
        raise HTTPException(status_code=400, detail="Can only refund completed payments")

    refund_amount = Decimal(str(data.amount)) if data.amount else txn.amount
    if refund_amount > txn.amount:
        raise HTTPException(status_code=400, detail="Refund exceeds payment amount")

    now = datetime.now(UTC)
    refund = Refund(
        id=str(uuid.uuid4()), payment_id=data.payment_id,
        booking_id=data.booking_id or txn.booking_id,
        amount=refund_amount, currency=txn.currency,
        reason=data.reason, status="processing",
        initiated_by=uid, created_at=now,
    )
    db.add(refund)
    txn.status = "refunded"
    txn.updated_at = now
    await db.flush()
    return {
        "refund_id": refund.id, "payment_id": data.payment_id,
        "amount": float(refund_amount), "status": "processing",
    }


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="Stripe-Signature", default=""),
    db: AsyncSession = Depends(get_db),
):
    if not STRIPE_WEBHOOK_SECRET:
        return {"status": "skipped", "reason": "webhook secret not configured"}

    body = await request.body()
    try:
        event = stripe.Webhook.construct_event(body, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except (stripe.error.SignatureVerificationError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook signature") from exc

    etype = event["type"]
    data = event["data"]["object"]
    now = datetime.now(UTC)

    if etype == "payment_intent.succeeded":
        r = await db.execute(select(Transaction).where(Transaction.stripe_payment_intent_id == data["id"]))
        txn = r.scalar_one_or_none()
        if txn:
            txn.status = "completed"
            txn.updated_at = now
            await db.flush()

    elif etype == "payment_intent.payment_failed":
        r = await db.execute(select(Transaction).where(Transaction.stripe_payment_intent_id == data["id"]))
        txn = r.scalar_one_or_none()
        if txn:
            txn.status = "failed"
            txn.updated_at = now
            await db.flush()

    elif etype == "payout.paid":
        r = await db.execute(select(Payout).where(Payout.stripe_payout_id == data["id"]))
        po = r.scalar_one_or_none()
        if po:
            po.status = "completed"
            po.completed_at = now
            await db.flush()

    elif etype == "payout.failed":
        r = await db.execute(select(Payout).where(Payout.stripe_payout_id == data["id"]))
        po = r.scalar_one_or_none()
        if po:
            po.status = "failed"
            await db.flush()

    return {"status": "processed", "type": etype}
