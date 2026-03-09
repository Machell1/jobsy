"""Match service API routes."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.models.match import MatchResponse

from .models import Match


class MatchStatusUpdate(BaseModel):
    status: Literal["completed", "cancelled"]

router = APIRouter(tags=["matches"])


def _get_user_id(request: Request) -> str:
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


@router.get("/", response_model=list[MatchResponse])
async def list_matches(
    request: Request,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    user_id = _get_user_id(request)
    query = (
        select(Match)
        .where(
            or_(Match.user_a_id == user_id, Match.user_b_id == user_id),
            Match.status == "active",
        )
        .order_by(Match.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match(match_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _get_user_id(request)
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if match.user_a_id != user_id and match.user_b_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")
    return match


@router.put("/{match_id}/status")
async def update_match_status(
    match_id: str, body: MatchStatusUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    user_id = _get_user_id(request)

    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if match.user_a_id != user_id and match.user_b_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")

    match.status = body.status
    await db.flush()
    return {"id": match.id, "status": match.status}
