"""Elasticsearch client for full-text search across listings and profiles.

Indexes:
  - jobsy-listings: Service listings with geo_point, categories, skills
  - jobsy-profiles: User profiles with skills, bio text

When Elasticsearch is unavailable, search falls back to SQL ILIKE queries
against the shared database.
"""

import logging
import os
from typing import Any

from elasticsearch import AsyncElasticsearch
from sqlalchemy import text

from shared.config import ELASTICSEARCH_URL
from shared.database import async_session_factory

logger = logging.getLogger(__name__)

ES_USERNAME = os.getenv("ELASTICSEARCH_USERNAME", "")
ES_PASSWORD = os.getenv("ELASTICSEARCH_PASSWORD", "")

_client: AsyncElasticsearch | None = None

LISTINGS_INDEX = "jobsy-listings"
PROFILES_INDEX = "jobsy-profiles"

LISTINGS_MAPPING = {
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "poster_id": {"type": "keyword"},
            "title": {"type": "text", "analyzer": "standard"},
            "description": {"type": "text", "analyzer": "standard"},
            "category": {"type": "keyword"},
            "skills": {"type": "keyword"},
            "parish": {"type": "keyword"},
            "location": {"type": "geo_point"},
            "listing_type": {"type": "keyword"},
            "budget_min": {"type": "float"},
            "budget_max": {"type": "float"},
            "status": {"type": "keyword"},
            "created_at": {"type": "date"},
        }
    }
}

PROFILES_MAPPING = {
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "display_name": {"type": "text"},
            "bio": {"type": "text", "analyzer": "standard"},
            "skills": {"type": "keyword"},
            "parish": {"type": "keyword"},
            "location": {"type": "geo_point"},
            "average_rating": {"type": "float"},
            "total_reviews": {"type": "integer"},
        }
    }
}


async def get_client() -> AsyncElasticsearch | None:
    """Get or create the Elasticsearch client."""
    global _client
    if _client is not None:
        return _client

    if not ELASTICSEARCH_URL:
        logger.warning("ELASTICSEARCH_URL not configured, search unavailable")
        return None

    try:
        kwargs: dict[str, Any] = {"hosts": [ELASTICSEARCH_URL]}
        if ES_USERNAME:
            kwargs["basic_auth"] = (ES_USERNAME, ES_PASSWORD)

        _client = AsyncElasticsearch(**kwargs)
        info = await _client.info()
        logger.info("Connected to Elasticsearch %s", info["version"]["number"])
        return _client
    except Exception:
        logger.warning("Elasticsearch not available at %s", ELASTICSEARCH_URL)
        _client = None
        return None


async def ensure_indices() -> None:
    """Create search indices if they don't exist."""
    client = await get_client()
    if not client:
        return

    for index, mapping in [(LISTINGS_INDEX, LISTINGS_MAPPING), (PROFILES_INDEX, PROFILES_MAPPING)]:
        if not await client.indices.exists(index=index):
            await client.indices.create(index=index, body=mapping)
            logger.info("Created index: %s", index)


async def index_listing(listing: dict) -> None:
    """Index or update a listing document."""
    client = await get_client()
    if not client:
        return

    doc = {
        "id": listing["id"],
        "poster_id": listing.get("poster_id"),
        "title": listing.get("title"),
        "description": listing.get("description"),
        "category": listing.get("category"),
        "skills": listing.get("skills_required", []),
        "parish": listing.get("parish"),
        "listing_type": listing.get("listing_type"),
        "budget_min": listing.get("budget_min"),
        "budget_max": listing.get("budget_max"),
        "status": listing.get("status", "active"),
        "created_at": listing.get("created_at"),
    }

    if listing.get("latitude") and listing.get("longitude"):
        doc["location"] = {"lat": listing["latitude"], "lon": listing["longitude"]}

    await client.index(index=LISTINGS_INDEX, id=listing["id"], document=doc)


async def index_profile(profile: dict) -> None:
    """Index or update a profile document."""
    client = await get_client()
    if not client:
        return

    doc = {
        "id": profile["id"],
        "display_name": profile.get("display_name"),
        "bio": profile.get("bio"),
        "skills": profile.get("skills", []),
        "parish": profile.get("parish"),
        "average_rating": profile.get("average_rating"),
        "total_reviews": profile.get("total_reviews"),
    }

    if profile.get("latitude") and profile.get("longitude"):
        doc["location"] = {"lat": profile["latitude"], "lon": profile["longitude"]}

    await client.index(index=PROFILES_INDEX, id=profile["id"], document=doc)


async def _fallback_search_listings(
    query: str,
    parish: str | None = None,
    category: str | None = None,
    listing_type: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """SQL fallback when Elasticsearch is unavailable.

    Uses raw SQL to avoid cross-service ORM model imports that are
    unavailable in the search service's container.
    """
    async with async_session_factory() as session:
        conditions = ["status = 'active'"]
        params: dict[str, Any] = {"limit": limit, "offset": offset}

        if query:
            conditions.append("(title ILIKE :pattern OR description ILIKE :pattern)")
            params["pattern"] = f"%{query}%"
        if parish:
            conditions.append("parish = :parish")
            params["parish"] = parish
        if category:
            conditions.append("category = :category")
            params["category"] = category
        if listing_type:
            conditions.append("listing_type = :listing_type")
            params["listing_type"] = listing_type

        where = " AND ".join(conditions)

        count_result = await session.execute(
            text(f"SELECT COUNT(*) FROM listings WHERE {where}"),  # noqa: S608
            params,
        )
        total = count_result.scalar() or 0

        result = await session.execute(
            text(
                f"SELECT id, poster_id, title, description, category, parish, "  # noqa: S608
                f"budget_min, budget_max, status, created_at "
                f"FROM listings WHERE {where} "
                f"ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
            ),
            params,
        )
        rows = result.mappings().all()

        hits = [
            {
                "id": r["id"],
                "poster_id": r["poster_id"],
                "title": r["title"],
                "description": r["description"],
                "category": r["category"],
                "parish": r["parish"],
                "budget_min": float(r["budget_min"]) if r["budget_min"] else None,
                "budget_max": float(r["budget_max"]) if r["budget_max"] else None,
                "status": r["status"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ]

        return {"hits": hits, "total": total, "source": "database"}


async def _fallback_search_profiles(
    query: str,
    parish: str | None = None,
    skills: list[str] | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """SQL fallback when Elasticsearch is unavailable.

    Uses raw SQL to avoid cross-service ORM model imports that are
    unavailable in the search service's container.
    """
    async with async_session_factory() as session:
        conditions = ["is_active = true"]
        params: dict[str, Any] = {"limit": limit, "offset": offset}

        if query:
            conditions.append("(display_name ILIKE :pattern OR bio ILIKE :pattern)")
            params["pattern"] = f"%{query}%"
        if parish:
            conditions.append("parish = :parish")
            params["parish"] = parish

        where = " AND ".join(conditions)

        count_result = await session.execute(
            text(f"SELECT COUNT(*) FROM profiles WHERE {where}"),  # noqa: S608
            params,
        )
        total = count_result.scalar() or 0

        result = await session.execute(
            text(
                f"SELECT id, display_name, bio, skills, parish, "  # noqa: S608
                f"rating_avg, rating_count "
                f"FROM profiles WHERE {where} "
                f"ORDER BY rating_avg DESC NULLS LAST LIMIT :limit OFFSET :offset"
            ),
            params,
        )
        rows = result.mappings().all()

        hits = [
            {
                "id": r["id"],
                "display_name": r["display_name"],
                "bio": r["bio"],
                "skills": r["skills"] or [],
                "parish": r["parish"],
                "average_rating": float(r["rating_avg"]) if r["rating_avg"] else None,
                "total_reviews": r["rating_count"] or 0,
            }
            for r in rows
        ]

        return {"hits": hits, "total": total, "source": "database"}


async def search_listings(
    query: str,
    parish: str | None = None,
    category: str | None = None,
    listing_type: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    radius_km: float = 25.0,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """Full-text search across listings with geo and facet filtering."""
    client = await get_client()
    if not client:
        logger.info("Elasticsearch unavailable, using database fallback for listings search")
        return await _fallback_search_listings(
            query=query,
            parish=parish,
            category=category,
            listing_type=listing_type,
            limit=limit,
            offset=offset,
        )

    must = []
    filter_clauses = []

    if query:
        must.append(
            {
                "multi_match": {
                    "query": query,
                    "fields": ["title^3", "description", "skills^2"],
                    "fuzziness": "AUTO",
                }
            }
        )

    filter_clauses.append({"term": {"status": "active"}})

    if parish:
        filter_clauses.append({"term": {"parish": parish}})
    if category:
        filter_clauses.append({"term": {"category": category}})
    if listing_type:
        filter_clauses.append({"term": {"listing_type": listing_type}})

    if lat is not None and lon is not None:
        filter_clauses.append(
            {
                "geo_distance": {
                    "distance": f"{radius_km}km",
                    "location": {"lat": lat, "lon": lon},
                }
            }
        )

    body: dict[str, Any] = {
        "query": {
            "bool": {
                "must": must or [{"match_all": {}}],
                "filter": filter_clauses,
            }
        },
        "from": offset,
        "size": limit,
        "sort": [{"_score": "desc"}, {"created_at": "desc"}],
    }

    # Add distance sort if geo query
    if lat is not None and lon is not None:
        body["sort"].insert(
            0,
            {
                "_geo_distance": {
                    "location": {"lat": lat, "lon": lon},
                    "order": "asc",
                    "unit": "km",
                }
            },
        )

    result = await client.search(index=LISTINGS_INDEX, body=body)

    hits = [{**hit["_source"], "_score": hit["_score"]} for hit in result["hits"]["hits"]]

    return {
        "hits": hits,
        "total": result["hits"]["total"]["value"],
        "source": "elasticsearch",
    }


async def search_profiles(
    query: str,
    parish: str | None = None,
    skills: list[str] | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """Full-text search across user profiles."""
    client = await get_client()
    if not client:
        logger.info("Elasticsearch unavailable, using database fallback for profiles search")
        return await _fallback_search_profiles(
            query=query,
            parish=parish,
            skills=skills,
            limit=limit,
            offset=offset,
        )

    must = []
    filter_clauses = []

    if query:
        must.append(
            {
                "multi_match": {
                    "query": query,
                    "fields": ["display_name^2", "bio", "skills^3"],
                    "fuzziness": "AUTO",
                }
            }
        )

    if parish:
        filter_clauses.append({"term": {"parish": parish}})
    if skills:
        for skill in skills:
            filter_clauses.append({"term": {"skills": skill}})

    body = {
        "query": {
            "bool": {
                "must": must or [{"match_all": {}}],
                "filter": filter_clauses,
            }
        },
        "from": offset,
        "size": limit,
        "sort": [
            {"_score": "desc"},
            {"average_rating": {"order": "desc", "missing": "_last"}},
        ],
    }

    result = await client.search(index=PROFILES_INDEX, body=body)

    hits = [{**hit["_source"], "_score": hit["_score"]} for hit in result["hits"]["hits"]]

    return {
        "hits": hits,
        "total": result["hits"]["total"]["value"],
        "source": "elasticsearch",
    }


async def close_client() -> None:
    """Close the Elasticsearch client."""
    global _client
    if _client:
        await _client.close()
        _client = None
