"""Tests for profiles service routes."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from shared.database import get_db


@pytest_asyncio.fixture
async def client(db_override, mock_publish_event):
    from profiles.app.main import app

    app.dependency_overrides[get_db] = db_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


class TestGetMyProfile:
    async def test_get_my_profile_not_found(self, client):
        response = await client.get("/me", headers={"X-User-ID": "user-no-profile"})
        assert response.status_code == 404

    async def test_get_my_profile_after_create(self, client):
        # Create the profile first
        await client.put("/me", json={
            "display_name": "Jane Doe",
            "is_provider": True,
        }, headers={"X-User-ID": "user-jane"})

        response = await client.get("/me", headers={"X-User-ID": "user-jane"})
        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "Jane Doe"
        assert data["is_provider"] is True


class TestCreateOrUpdateProfile:
    async def test_create_profile(self, client):
        response = await client.put("/me", json={
            "display_name": "John Smith",
            "is_provider": False,
            "bio": "I need odd jobs done.",
            "parish": "Kingston",
        }, headers={"X-User-ID": "user-john"})

        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "John Smith"
        assert data["is_provider"] is False
        assert data["bio"] == "I need odd jobs done."
        assert data["parish"] == "Kingston"
        assert data["user_id"] == "user-john"
        assert "id" in data

    async def test_update_existing_profile(self, client):
        # Create profile
        await client.put("/me", json={
            "display_name": "Original Name",
            "is_provider": False,
        }, headers={"X-User-ID": "user-update"})

        # Update profile
        response = await client.put("/me", json={
            "display_name": "Updated Name",
            "is_provider": True,
            "bio": "Now I am a provider.",
            "service_category": "plumbing",
        }, headers={"X-User-ID": "user-update"})

        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "Updated Name"
        assert data["is_provider"] is True
        assert data["bio"] == "Now I am a provider."
        assert data["service_category"] == "plumbing"

    async def test_create_profile_with_optional_fields(self, client):
        response = await client.put("/me", json={
            "display_name": "Full Profile",
            "is_provider": True,
            "bio": "Experienced handyman",
            "service_category": "electrical",
            "skills": ["wiring", "outlets"],
            "hourly_rate": "50.00",
            "parish": "St. Andrew",
        }, headers={"X-User-ID": "user-full"})

        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "Full Profile"
        assert data["service_category"] == "electrical"
        assert data["hourly_rate"] == "50.00"


class TestGetProfileByUserId:
    async def test_get_profile_by_user_id(self, client):
        # Create the profile first
        await client.put("/me", json={
            "display_name": "Findable User",
            "is_provider": True,
        }, headers={"X-User-ID": "user-findable"})

        # Fetch by user_id (public endpoint, no X-User-ID needed)
        response = await client.get("/user-findable")
        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "Findable User"
        assert data["user_id"] == "user-findable"

    async def test_get_profile_not_found(self, client):
        response = await client.get("/nonexistent-user")
        assert response.status_code == 404


class TestAuthRequired:
    async def test_get_me_without_header(self, client):
        response = await client.get("/me")
        assert response.status_code == 401

    async def test_put_me_without_header(self, client):
        response = await client.put("/me", json={
            "display_name": "No Auth",
            "is_provider": False,
        })
        assert response.status_code == 401
