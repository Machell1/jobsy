"""Swipes routes merged into the gateway (formerly swipes microservice)."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.events import publish_event
from shared.models.swipe import SwipeCreate, SwipeResponse

from ..deps import get_current_user
from ..models_swipes import Swipe

router = APIRouter(tags=["swipes"])


@router.post("/", response_model=SwipeResponse, status_code=status.HTTP_201_CREATED)
async def record_swipe(
    data: SwipeCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["user_id"]

    swipe = Swipe(
        id=str(uuid.uuid4()),
        swiper_id=user_id,
        target_id=data.target_id,
        target_type=data.target_type,
        direction=data.direction,
        created_at=datetime.now(UTC),
    )

    try:
        db.add(swipe)
        await db.flush()
    except IntegrityError as err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already swiped on this target",
        ) from err

    # Publish event for right swipes (matches service listens)
    if data.direction == "right":
        await publish_event(
            "swipe.right",
            {
                "swiper_id": user_id,
                "target_id": data.target_id,
                "target_type": data.target_type,
            },
        )
    else:
        await publish_event(
            "swipe.left",
            {
                "swiper_id": user_id,
                "target_id": data.target_id,
                "target_type": data.target_type,
            },
        )

    return swipe


@router.get("/history", response_model=list[SwipeResponse])
async def get_swipe_history(
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user["user_id"]
    query = (
        select(Swipe).where(Swipe.swiper_id == user_id).order_by(Swipe.created_at.desc()).offset(offset).limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()
