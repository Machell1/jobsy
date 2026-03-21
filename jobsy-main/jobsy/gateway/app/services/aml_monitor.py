"""Anti-Money Laundering and fraud detection monitor.

Provides automated checks for suspicious transaction patterns, malicious
cancellation abuse, and account freezing.  Compliant with Jamaica's
Proceeds of Crime Act (POCA) and Financial Investigations Division (FID)
reporting requirements.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models_aml import AccountFreeze, JCFReferral, SuspiciousActivity
from ..models_bidding import ContractCancellation
from ..models_payments import Transaction

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Thresholds (configurable via env in production)
# ---------------------------------------------------------------------------
RAPID_TRANSACTION_LIMIT = 5          # max transactions per hour
UNUSUAL_AMOUNT_THRESHOLD = 500_000   # JMD — amounts above this get flagged
CANCELLATION_ABUSE_LIMIT = 3         # max cancellations in 30 days
CANCELLATION_ABUSE_WINDOW_DAYS = 30


class AMLMonitor:
    """Stateless service for AML and fraud checks."""

    @staticmethod
    async def check_transaction(
        user_id: str,
        amount: float,
        transaction_id: str | None = None,
        contract_id: str | None = None,
        db: AsyncSession | None = None,
    ) -> SuspiciousActivity | None:
        """Check a transaction for suspicious patterns.

        Returns a ``SuspiciousActivity`` record if flagged, else ``None``.
        """
        if db is None:
            return None

        now = datetime.now(UTC)
        flags: list[tuple[str, str, str]] = []  # (type, description, severity)

        # Check 1: Rapid transactions (>5 in 1 hour)
        one_hour_ago = now - timedelta(hours=1)
        result = await db.execute(
            select(func.count(Transaction.id)).where(
                Transaction.payer_id == user_id,
                Transaction.created_at >= one_hour_ago,
            )
        )
        recent_count = result.scalar() or 0
        if recent_count >= RAPID_TRANSACTION_LIMIT:
            flags.append((
                "rapid_transactions",
                f"User {user_id} has made {recent_count} transactions in the last hour (limit: {RAPID_TRANSACTION_LIMIT})",
                "high",
            ))

        # Check 2: Unusually large amount
        if amount > UNUSUAL_AMOUNT_THRESHOLD:
            flags.append((
                "unusual_amount",
                f"Transaction amount JMD {amount:,.2f} exceeds monitoring threshold of JMD {UNUSUAL_AMOUNT_THRESHOLD:,.2f}",
                "medium",
            ))

        if not flags:
            return None

        # Create the most severe flag as a SuspiciousActivity
        flags.sort(key=lambda f: {"low": 0, "medium": 1, "high": 2, "critical": 3}.get(f[2], 0), reverse=True)
        top = flags[0]
        activity = SuspiciousActivity(
            id=str(uuid.uuid4()),
            user_id=user_id,
            activity_type=top[0],
            description=top[1],
            severity=top[2],
            related_transaction_id=transaction_id,
            related_contract_id=contract_id,
            status="flagged",
            created_at=now,
        )
        db.add(activity)
        await db.flush()

        logger.warning("AML flag: %s for user %s — %s", top[0], user_id, top[1])

        # Auto-freeze for high/critical severity
        if top[2] in ("high", "critical"):
            await AMLMonitor.auto_freeze_account(
                user_id=user_id,
                reason=top[1],
                activity_id=activity.id,
                freeze_type="aml_review",
                db=db,
            )

        return activity

    @staticmethod
    async def check_cancellation_pattern(
        user_id: str,
        contract_id: str | None = None,
        db: AsyncSession | None = None,
    ) -> SuspiciousActivity | None:
        """Check for malicious cancellation abuse (>3 in 30 days)."""
        if db is None:
            return None

        now = datetime.now(UTC)
        window_start = now - timedelta(days=CANCELLATION_ABUSE_WINDOW_DAYS)

        result = await db.execute(
            select(func.count(ContractCancellation.id)).where(
                ContractCancellation.cancelled_by == user_id,
                ContractCancellation.created_at >= window_start,
            )
        )
        cancel_count = result.scalar() or 0

        if cancel_count < CANCELLATION_ABUSE_LIMIT:
            return None

        activity = SuspiciousActivity(
            id=str(uuid.uuid4()),
            user_id=user_id,
            activity_type="multiple_cancellations",
            description=(
                f"User {user_id} has cancelled {cancel_count} contracts in the last "
                f"{CANCELLATION_ABUSE_WINDOW_DAYS} days (limit: {CANCELLATION_ABUSE_LIMIT})"
            ),
            severity="high",
            related_contract_id=contract_id,
            status="flagged",
            created_at=now,
        )
        db.add(activity)
        await db.flush()

        logger.warning("AML cancellation abuse flag for user %s — %d cancellations", user_id, cancel_count)

        await AMLMonitor.auto_freeze_account(
            user_id=user_id,
            reason=f"Malicious cancellation pattern: {cancel_count} cancellations in {CANCELLATION_ABUSE_WINDOW_DAYS} days",
            activity_id=activity.id,
            freeze_type="malicious_cancellation",
            db=db,
        )

        return activity

    @staticmethod
    async def auto_freeze_account(
        user_id: str,
        reason: str,
        activity_id: str | None = None,
        freeze_type: str = "aml_review",
        db: AsyncSession | None = None,
    ) -> AccountFreeze | None:
        """Freeze a user's account for AML or fraud reasons."""
        if db is None:
            return None

        now = datetime.now(UTC)

        # Check if already frozen
        result = await db.execute(
            select(AccountFreeze).where(
                AccountFreeze.user_id == user_id,
                AccountFreeze.is_active == True,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            logger.info("Account %s already frozen", user_id)
            return existing

        freeze = AccountFreeze(
            id=str(uuid.uuid4()),
            user_id=user_id,
            reason=reason,
            freeze_type=freeze_type,
            related_activity_id=activity_id,
            is_active=True,
            frozen_at=now,
        )
        db.add(freeze)
        await db.flush()

        logger.warning("Account FROZEN: user=%s type=%s reason=%s", user_id, freeze_type, reason)
        return freeze

    @staticmethod
    async def create_jcf_referral(
        user_id: str,
        offence_type: str,
        description: str,
        evidence_urls: list[str] | None = None,
        activity_id: str | None = None,
        contract_id: str | None = None,
        db: AsyncSession | None = None,
    ) -> JCFReferral | None:
        """Create a referral to the Jamaica Constabulary Force."""
        if db is None:
            return None

        now = datetime.now(UTC)
        referral = JCFReferral(
            id=str(uuid.uuid4()),
            user_id=user_id,
            related_activity_id=activity_id,
            related_contract_id=contract_id,
            offence_type=offence_type,
            description=description,
            evidence_urls=evidence_urls or [],
            status="pending",
            created_at=now,
        )
        db.add(referral)
        await db.flush()

        logger.warning(
            "JCF REFERRAL created: user=%s offence=%s id=%s",
            user_id, offence_type, referral.id,
        )

        # Also freeze the account
        await AMLMonitor.auto_freeze_account(
            user_id=user_id,
            reason=f"Criminal referral: {offence_type}",
            activity_id=activity_id,
            freeze_type="criminal_referral",
            db=db,
        )

        return referral
