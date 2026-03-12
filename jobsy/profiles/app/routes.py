"""Profile service API routes."""

import uuid
from datetime import UTC, datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.events import publish_event
from shared.geo import encode_geohash, get_parish

from .models import Follow, Profile, UserTag, VerificationRequest
from .schemas import (
    FollowRequest,
    ProfileCreate,
    ProfileResponse,
    ProfileUpdate,
    TagUserRequest,
)

router = APIRouter(tags=["profiles"])


def _get_user_id(request: Request) -> str:
    """Extract user ID from gateway-forwarded header."""
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _get_user_id(request)
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.put("/me", response_model=ProfileResponse)
async def update_or_create_profile(
    data: ProfileCreate | ProfileUpdate, request: Request, db: AsyncSession = Depends(get_db)
):
    user_id = _get_user_id(request)
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()

    now = datetime.now(UTC)
    geohash = None
    parish = data.parish

    if data.latitude is not None and data.longitude is not None:
        geohash = encode_geohash(data.latitude, data.longitude)
        if not parish:
            parish = get_parish(data.latitude, data.longitude)

    if profile:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)
        profile.geohash = geohash or profile.geohash
        profile.parish = parish or profile.parish
        profile.updated_at = now
    else:
        profile = Profile(
            id=str(uuid.uuid4()),
            user_id=user_id,
            geohash=geohash,
            parish=parish,
            is_verified=False,
            is_active=True,
            created_at=now,
            updated_at=now,
            **data.model_dump(exclude={"parish"}),
        )
        db.add(profile)

    await db.flush()

    await publish_event("profile.updated", {
        "id": profile.id,
        "user_id": user_id,
        "display_name": profile.display_name,
        "bio": profile.bio,
        "skills": profile.skills,
        "service_category": profile.service_category,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "parish": parish,
    })

    return profile


@router.get("/nearby/search")
async def get_nearby_profiles(
    lat: float,
    lng: float,
    radius_km: float = 25.0,
    category: str | None = None,
    role: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Find profiles near a location. Optionally filter by role (provider/hirer/advertiser)."""
    geohash_prefix = encode_geohash(lat, lng, precision=4)
    query = select(Profile).where(
        Profile.geohash.startswith(geohash_prefix),
        Profile.is_active.is_(True),
    )
    if category:
        query = query.where(Profile.service_category == category)
    if role == "provider":
        query = query.where(Profile.is_provider.is_(True))
    elif role == "hirer":
        query = query.where(Profile.is_hirer.is_(True))
    elif role == "advertiser":
        query = query.where(Profile.is_advertiser.is_(True))
    query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


# --- Social sharing & invite links ---


@router.get("/me/share-links")
async def get_share_links(request: Request, db: AsyncSession = Depends(get_db)):
    """Generate social media share links to invite followers to Jobsy."""
    user_id = _get_user_id(request)
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    profile_url = f"https://www.jobsyja.com/provider.html?user={user_id}"
    invite_text = quote(f"Check out my profile on Jobsy Jamaica! {profile_url}")

    return {
        "profile_url": profile_url,
        "social_links": {
            "instagram": profile.instagram_url,
            "twitter": profile.twitter_url,
            "tiktok": profile.tiktok_url,
            "youtube": profile.youtube_url,
            "linkedin": profile.linkedin_url,
            "portfolio": profile.portfolio_url,
        },
        "invite_links": {
            "twitter": f"https://twitter.com/intent/tweet?text={invite_text}",
            "whatsapp": f"https://wa.me/?text={invite_text}",
            "telegram": f"https://t.me/share/url?url={quote(profile_url)}&text={quote('Follow me on Jobsy Jamaica!')}",
            "linkedin": f"https://www.linkedin.com/sharing/share-offsite/?url={quote(profile_url)}",
        },
    }


# --- Follower System ---


@router.post("/follow", status_code=status.HTTP_201_CREATED)
async def follow_user(data: FollowRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Follow another user on Jobsy."""
    follower_id = _get_user_id(request)
    following_id = data.user_id

    if follower_id == following_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")

    # Check if already following
    existing = await db.execute(
        select(Follow).where(Follow.follower_id == follower_id, Follow.following_id == following_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already following this user")

    follow = Follow(
        id=str(uuid.uuid4()),
        follower_id=follower_id,
        following_id=following_id,
        created_at=datetime.now(UTC),
    )
    db.add(follow)

    # Update follower counts
    await _update_follower_counts(follower_id, following_id, db)
    await db.flush()

    await publish_event("user.followed", {
        "follower_id": follower_id,
        "following_id": following_id,
    })

    return {"status": "following", "following_id": following_id}


@router.delete("/follow/{target_user_id}", status_code=status.HTTP_200_OK)
async def unfollow_user(target_user_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Unfollow a user."""
    follower_id = _get_user_id(request)

    result = await db.execute(
        select(Follow).where(Follow.follower_id == follower_id, Follow.following_id == target_user_id)
    )
    follow = result.scalar_one_or_none()
    if not follow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not following this user")

    await db.delete(follow)
    await _update_follower_counts(follower_id, target_user_id, db)
    await db.flush()

    return {"status": "unfollowed", "unfollowed_id": target_user_id}


@router.get("/followers/{user_id}")
async def get_followers(
    user_id: str,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get list of followers for a user."""
    query = (
        select(Follow.follower_id, Follow.created_at)
        .where(Follow.following_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()
    return [{"user_id": r[0], "followed_at": r[1].isoformat()} for r in rows]


@router.get("/following/{user_id}")
async def get_following(
    user_id: str,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get list of users this user is following."""
    query = (
        select(Follow.following_id, Follow.created_at)
        .where(Follow.follower_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()
    return [{"user_id": r[0], "followed_at": r[1].isoformat()} for r in rows]


async def _update_follower_counts(follower_id: str, following_id: str, db: AsyncSession) -> None:
    """Update denormalized follower/following counts on profile."""
    # Update following_count for follower
    follower_profile = await db.execute(select(Profile).where(Profile.user_id == follower_id))
    fp = follower_profile.scalar_one_or_none()
    if fp:
        count_result = await db.execute(
            select(func.count()).where(Follow.follower_id == follower_id)
        )
        fp.following_count = count_result.scalar() or 0

    # Update follower_count for followed user
    following_profile = await db.execute(select(Profile).where(Profile.user_id == following_id))
    fgp = following_profile.scalar_one_or_none()
    if fgp:
        count_result = await db.execute(
            select(func.count()).where(Follow.following_id == following_id)
        )
        fgp.follower_count = count_result.scalar() or 0


# --- User Tagging ---


@router.post("/tag", status_code=status.HTTP_201_CREATED)
async def tag_user(data: TagUserRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Tag a user (provider) in a listing, review, or post."""
    tagger_id = _get_user_id(request)

    # Verify tagged user exists
    result = await db.execute(select(Profile).where(Profile.user_id == data.tagged_user_id, Profile.is_active.is_(True)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tagged user not found")

    # Check for duplicate tag
    existing = await db.execute(
        select(UserTag).where(
            UserTag.tagger_id == tagger_id,
            UserTag.tagged_user_id == data.tagged_user_id,
            UserTag.entity_type == data.entity_type,
            UserTag.entity_id == data.entity_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already tagged in this entity")

    tag = UserTag(
        id=str(uuid.uuid4()),
        tagger_id=tagger_id,
        tagged_user_id=data.tagged_user_id,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        created_at=datetime.now(UTC),
    )
    db.add(tag)
    await db.flush()

    await publish_event("user.tagged", {
        "tagger_id": tagger_id,
        "tagged_user_id": data.tagged_user_id,
        "entity_type": data.entity_type,
        "entity_id": data.entity_id,
    })

    return {"id": tag.id, "tagged_user_id": data.tagged_user_id, "entity_type": data.entity_type}


@router.get("/tags/{user_id}")
async def get_user_tags(
    user_id: str,
    entity_type: str | None = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get all tags for a user (places they've been tagged)."""
    query = select(UserTag).where(UserTag.tagged_user_id == user_id)
    if entity_type:
        query = query.where(UserTag.entity_type == entity_type)
    query = query.order_by(UserTag.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    tags = result.scalars().all()
    return [
        {
            "id": t.id,
            "tagger_id": t.tagger_id,
            "entity_type": t.entity_type,
            "entity_id": t.entity_id,
            "created_at": t.created_at.isoformat(),
        }
        for t in tags
    ]


@router.delete("/tag/{tag_id}")
async def remove_tag(tag_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Remove a tag (only the tagger or the tagged user can remove)."""
    user_id = _get_user_id(request)

    result = await db.execute(select(UserTag).where(UserTag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    if tag.tagger_id != user_id and tag.tagged_user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to remove this tag")

    await db.delete(tag)
    await db.flush()
    return {"status": "removed", "tag_id": tag_id}


# --- Verification ---


class VerificationSubmit(BaseModel):
    document_urls: list[str]


@router.post("/verification/submit", status_code=status.HTTP_201_CREATED)
async def submit_verification(
    data: VerificationSubmit, request: Request, db: AsyncSession = Depends(get_db)
):
    """Submit documents for provider verification."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(VerificationRequest).where(
            VerificationRequest.user_id == user_id,
            VerificationRequest.status == "pending",
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending verification request already exists",
        )

    verification = VerificationRequest(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_urls=data.document_urls,
        status="pending",
        submitted_at=datetime.now(UTC),
    )
    db.add(verification)
    await db.flush()

    return {"id": verification.id, "status": verification.status}


@router.get("/verification/status")
async def verification_status(request: Request, db: AsyncSession = Depends(get_db)):
    """Check current verification status."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(VerificationRequest)
        .where(VerificationRequest.user_id == user_id)
        .order_by(VerificationRequest.submitted_at.desc())
        .limit(1)
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verification request found",
        )

    return {
        "id": verification.id,
        "status": verification.status,
        "submitted_at": verification.submitted_at.isoformat(),
        "reviewed_at": verification.reviewed_at.isoformat() if verification.reviewed_at else None,
        "reviewer_notes": verification.reviewer_notes,
    }


# NOTE: This catch-all route MUST be declared after all fixed-path routes
@router.get("/{user_id}", response_model=ProfileResponse)
async def get_profile(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == user_id, Profile.is_active.is_(True)))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile
