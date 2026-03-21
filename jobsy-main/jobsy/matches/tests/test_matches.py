"""Tests for matches service routes."""

import uuid
from datetime import UTC, datetime

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from shared.database import get_db


@pytest_asyncio.fixture
async def client(db_override, mock_publish_event):
    from matches.app.main import app

    app.dependency_overrides[get_db] = db_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seeded_match(test_session):
    """Seed a match between two users."""
    from matches.app.models import Match

    match = Match(
        id=str(uuid.uuid4()),
        user_a_id="user-a",
        user_b_id="user-b",
        listing_id="listing-1",
        status="active",
        created_at=datetime.now(UTC),
    )
    test_session.add(match)
    await test_session.commit()
    return match


class TestListMatches:
    async def test_list_matches_as_user_a(self, client, seeded_match):
        response = await client.get("/", headers={"X-User-ID": "user-a"})
        assert response.status_code == 200
        matches = response.json()
        assert len(matches) == 1
        assert matches[0]["id"] == seeded_match.id

    async def test_list_matches_as_user_b(self, client, seeded_match):
        response = await client.get("/", headers={"X-User-ID": "user-b"})
        assert response.status_code == 200
        matches = response.json()
        assert len(matches) == 1

    async def test_list_matches_empty_for_non_participant(self, client, seeded_match):
        response = await client.get("/", headers={"X-User-ID": "user-c"})
        assert response.status_code == 200
        assert response.json() == []


class TestGetMatch:
    async def test_get_match_as_participant(self, client, seeded_match):
        response = await client.get(f"/{seeded_match.id}", headers={"X-User-ID": "user-a"})
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == seeded_match.id
        assert data["user_a_id"] == "user-a"
        assert data["user_b_id"] == "user-b"
        assert data["status"] == "active"

    async def test_get_match_forbidden_for_non_participant(self, client, seeded_match):
        response = await client.get(f"/{seeded_match.id}", headers={"X-User-ID": "stranger"})
        assert response.status_code == 403

    async def test_get_match_not_found(self, client):
        response = await client.get("/nonexistent-id", headers={"X-User-ID": "user-a"})
        assert response.status_code == 404


class TestUpdateMatchStatus:
    async def test_update_status_to_completed(self, client, seeded_match):
        response = await client.put(
            f"/{seeded_match.id}/status",
            json={"status": "completed"},
            headers={"X-User-ID": "user-a"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"

    async def test_update_status_to_cancelled(self, client, seeded_match):
        response = await client.put(
            f"/{seeded_match.id}/status",
            json={"status": "cancelled"},
            headers={"X-User-ID": "user-b"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"

    async def test_update_status_invalid_value(self, client, seeded_match):
        response = await client.put(
            f"/{seeded_match.id}/status",
            json={"status": "invalid"},
            headers={"X-User-ID": "user-a"},
        )
        assert response.status_code == 422

    async def test_update_status_forbidden_for_non_participant(self, client, seeded_match):
        response = await client.put(
            f"/{seeded_match.id}/status",
            json={"status": "completed"},
            headers={"X-User-ID": "stranger"},
        )
        assert response.status_code == 403


class TestAuthRequired:
    async def test_list_matches_without_header(self, client):
        response = await client.get("/")
        assert response.status_code == 401

    async def test_get_match_without_header(self, client, seeded_match):
        response = await client.get(f"/{seeded_match.id}")
        assert response.status_code == 401

    async def test_update_status_without_header(self, client, seeded_match):
        response = await client.put(
            f"/{seeded_match.id}/status",
            json={"status": "completed"},
        )
        assert response.status_code == 401
