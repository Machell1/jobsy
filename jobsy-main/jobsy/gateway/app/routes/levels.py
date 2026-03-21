"""Provider Levels system routes."""

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["levels"])

# ---------------------------------------------------------------------------
# Level definitions
# ---------------------------------------------------------------------------

LEVEL_DEFINITIONS = [
    {
        "level": 1,
        "name": "New",
        "color": "#9CA3AF",  # gray
        "min_jobs": 0,
        "min_rating": 0,
        "extra": None,
    },
    {
        "level": 2,
        "name": "Rising",
        "color": "#22C55E",  # green
        "min_jobs": 5,
        "min_rating": 4.0,
        "extra": None,
    },
    {
        "level": 3,
        "name": "Established",
        "color": "#3B82F6",  # blue
        "min_jobs": 25,
        "min_rating": 4.5,
        "extra": "id_verified",
    },
    {
        "level": 4,
        "name": "Expert",
        "color": "#A855F7",  # purple
        "min_jobs": 100,
        "min_rating": 4.8,
        "extra": "low_cancellation",
    },
    {
        "level": 5,
        "name": "Elite",
        "color": "#EAB308",  # gold
        "min_jobs": 500,
        "min_rating": 4.9,
        "extra": "top_1_percent",
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_provider_stats(user_id: str, db: AsyncSession) -> dict:
    """Gather stats needed for level calculation."""
    # Total completed jobs
    completed_result = await db.execute(
        text(
            "SELECT COUNT(*) FROM bookings WHERE provider_id = :uid AND status = 'completed'"
        ),
        {"uid": user_id},
    )
    total_completed = completed_result.scalar() or 0

    # Total bookings for cancellation rate
    total_bookings_result = await db.execute(
        text(
            "SELECT COUNT(*) FROM bookings WHERE provider_id = :uid AND status IN ('completed', 'cancelled')"
        ),
        {"uid": user_id},
    )
    total_bookings = total_bookings_result.scalar() or 0

    cancelled_result = await db.execute(
        text(
            "SELECT COUNT(*) FROM bookings WHERE provider_id = :uid AND status = 'cancelled' AND cancelled_by = :uid"
        ),
        {"uid": user_id},
    )
    cancelled_by_provider = cancelled_result.scalar() or 0

    cancellation_rate = (cancelled_by_provider / total_bookings * 100) if total_bookings > 0 else 0.0

    # Average rating from reviews
    avg_result = await db.execute(
        text("SELECT AVG(rating) FROM reviews WHERE reviewee_id = :uid"),
        {"uid": user_id},
    )
    avg_rating_raw = avg_result.scalar()
    average_rating = float(avg_rating_raw) if avg_rating_raw is not None else 0.0

    # Is ID verified
    verified_result = await db.execute(
        text("SELECT is_verified FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    is_verified = bool(verified_result.scalar())

    # Parish-level ranking (for top 1%)
    parish_result = await db.execute(
        text("SELECT parish FROM profiles WHERE user_id = :uid"),
        {"uid": user_id},
    )
    parish = parish_result.scalar()

    is_top_1_percent = False
    if parish:
        try:
            rank_result = await db.execute(
                text(
                    "SELECT COUNT(*) FROM profiles p "
                    "JOIN (SELECT reviewee_id, AVG(rating) as avg_r FROM reviews GROUP BY reviewee_id) r "
                    "ON p.user_id = r.reviewee_id "
                    "WHERE p.parish = :parish"
                ),
                {"parish": parish},
            )
            total_in_parish = rank_result.scalar() or 0
            if total_in_parish > 0:
                better_result = await db.execute(
                    text(
                        "SELECT COUNT(*) FROM profiles p "
                        "JOIN (SELECT reviewee_id, AVG(rating) as avg_r FROM reviews GROUP BY reviewee_id) r "
                        "ON p.user_id = r.reviewee_id "
                        "WHERE p.parish = :parish AND r.avg_r > :my_rating"
                    ),
                    {"parish": parish, "my_rating": average_rating},
                )
                providers_above = better_result.scalar() or 0
                percentile = (providers_above / total_in_parish) * 100
                is_top_1_percent = percentile < 1
        except Exception:
            pass

    return {
        "total_completed_jobs": total_completed,
        "average_rating": round(average_rating, 2),
        "cancellation_rate": round(cancellation_rate, 2),
        "is_verified": is_verified,
        "is_top_1_percent": is_top_1_percent,
        "parish": parish,
    }


def _calculate_level(stats: dict) -> int:
    """Calculate provider level from stats."""
    level = 1

    # Level 2: Rising
    if stats["total_completed_jobs"] >= 5 and stats["average_rating"] >= 4.0:
        level = 2

    # Level 3: Established
    if (
        stats["total_completed_jobs"] >= 25
        and stats["average_rating"] >= 4.5
        and stats["is_verified"]
    ):
        level = 3

    # Level 4: Expert
    if (
        stats["total_completed_jobs"] >= 100
        and stats["average_rating"] >= 4.8
        and stats["cancellation_rate"] < 5
    ):
        level = 4

    # Level 5: Elite
    if (
        stats["total_completed_jobs"] >= 500
        and stats["average_rating"] >= 4.9
        and stats["is_top_1_percent"]
    ):
        level = 5

    return level


def _next_level_requirements(current_level: int, stats: dict) -> dict | None:
    """Describe what the provider needs to reach the next level."""
    if current_level >= 5:
        return None

    next_def = LEVEL_DEFINITIONS[current_level]  # index = current_level since levels are 1-indexed
    reqs = {
        "next_level": next_def["level"],
        "next_level_name": next_def["name"],
        "requirements": [],
    }

    if stats["total_completed_jobs"] < next_def["min_jobs"]:
        reqs["requirements"].append(
            f"Complete {next_def['min_jobs'] - stats['total_completed_jobs']} more jobs "
            f"(need {next_def['min_jobs']} total)"
        )

    if stats["average_rating"] < next_def["min_rating"]:
        reqs["requirements"].append(
            f"Achieve {next_def['min_rating']}+ average rating (currently {stats['average_rating']})"
        )

    if next_def["extra"] == "id_verified" and not stats["is_verified"]:
        reqs["requirements"].append("Get ID verified")

    if next_def["extra"] == "low_cancellation" and stats["cancellation_rate"] >= 5:
        reqs["requirements"].append(
            f"Reduce cancellation rate below 5% (currently {stats['cancellation_rate']}%)"
        )

    if next_def["extra"] == "top_1_percent" and not stats["is_top_1_percent"]:
        reqs["requirements"].append("Reach top 1% in your parish")

    return reqs


def _build_level_response(level: int, stats: dict) -> dict:
    """Build the standard level response object."""
    defn = LEVEL_DEFINITIONS[level - 1]
    return {
        "level": level,
        "level_name": defn["name"],
        "level_color": defn["color"],
        "total_completed_jobs": stats["total_completed_jobs"],
        "average_rating": stats["average_rating"],
        "cancellation_rate": stats["cancellation_rate"],
        "is_verified": stats["is_verified"],
        "points": stats["total_completed_jobs"] * 10 + int(stats["average_rating"] * 20),
        "next_level_requirements": _next_level_requirements(level, stats),
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/me")
async def get_my_level(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's provider level, points, and progress."""
    stats = await _get_provider_stats(user["user_id"], db)
    level = _calculate_level(stats)
    return _build_level_response(level, stats)


@router.get("/{user_id}")
async def get_provider_level(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a provider's level (public endpoint)."""
    # Verify user exists
    exists = await db.execute(text("SELECT id FROM users WHERE id = :uid"), {"uid": user_id})
    if not exists.scalar():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    stats = await _get_provider_stats(user_id, db)
    level = _calculate_level(stats)
    return _build_level_response(level, stats)


@router.post("/recalculate")
async def recalculate_all_levels(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint to recalculate all provider levels."""
    if "admin" not in user.get("roles", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    # Get all providers
    providers_result = await db.execute(
        text("SELECT id FROM users WHERE roles::text LIKE :pattern"),
        {"pattern": "%provider%"},
    )
    provider_ids = [row[0] for row in providers_result.fetchall()]

    updated = 0
    for pid in provider_ids:
        try:
            stats = await _get_provider_stats(pid, db)
            level = _calculate_level(stats)
            # Update profile with calculated level
            await db.execute(
                text("UPDATE profiles SET level = :level WHERE user_id = :uid"),
                {"level": level, "uid": pid},
            )
            updated += 1
        except Exception as exc:
            logger.warning("Failed to recalculate level for %s: %s", pid, exc)

    await db.commit()
    return {"message": f"Recalculated levels for {updated} providers", "total": len(provider_ids)}
