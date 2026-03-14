"""PayPal payment routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import get_current_user
from ..integrations.paypal_client import create_payment, execute_payment, paypal_ok

logger = logging.getLogger(__name__)

router = APIRouter(tags=["payments"])


class PayPalCreateRequest(BaseModel):
    amount: str
    currency: str = "USD"
    description: str = ""
    return_url: str
    cancel_url: str


class PayPalExecuteRequest(BaseModel):
    payment_id: str
    payer_id: str


@router.post("/paypal/create")
async def paypal_create(
    data: PayPalCreateRequest,
    user: dict = Depends(get_current_user),
):
    """Create a PayPal payment."""
    if not paypal_ok():
        raise HTTPException(status_code=503, detail="PayPal is not configured")
    result = create_payment(
        amount=data.amount,
        currency=data.currency,
        description=data.description,
        return_url=data.return_url,
        cancel_url=data.cancel_url,
    )
    if not result:
        raise HTTPException(status_code=502, detail="PayPal payment creation failed")
    return result


@router.post("/paypal/execute")
async def paypal_execute(
    data: PayPalExecuteRequest,
    user: dict = Depends(get_current_user),
):
    """Execute an approved PayPal payment."""
    if not paypal_ok():
        raise HTTPException(status_code=503, detail="PayPal is not configured")
    result = execute_payment(data.payment_id, data.payer_id)
    if not result:
        raise HTTPException(status_code=502, detail="PayPal payment execution failed")
    return result
