"""Tests for listings service routes."""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from shared.database import get_db


@pytest_asyncio.fixture
async def client(db_override, mock_publish_event):
    from listings.app.main import app

    app.dependency_overrides[get_db] = db_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


VALID_LISTING = {
    "title": "Fix my kitchen sink",
    "description": "Leaking pipe under the kitchen sink needs repair.",
    "category": "plumbing",
    "parish": "Kingston",
}


class TestCreateListing:
    async def test_create_listing_success(self, client):
        response = await client.post("/", json=VALID_LISTING, headers={"X-User-ID": "poster-1"})

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Fix my kitchen sink"
        assert data["category"] == "plumbing"
        assert data["poster_id"] == "poster-1"
        assert data["status"] == "active"
        assert "id" in data

    async def test_create_listing_with_budget(self, client):
        payload = {
            **VALID_LISTING,
            "budget_min": "500.00",
            "budget_max": "1500.00",
        }
        response = await client.post("/", json=payload, headers={"X-User-ID": "poster-2"})

        assert response.status_code == 201
        data = response.json()
        assert data["budget_min"] == "500.00"
        assert data["budget_max"] == "1500.00"

    async def test_create_listing_missing_required_field(self, client):
        response = await client.post("/", json={
            "title": "Incomplete",
        }, headers={"X-User-ID": "poster-3"})
        assert response.status_code == 422


class TestListListings:
    async def test_list_active_listings(self, client):
        # Seed two listings
        await client.post("/", json=VALID_LISTING, headers={"X-User-ID": "poster-list-1"})
        await client.post("/", json={
            "title": "Paint my fence",
            "description": "White picket fence needs painting.",
            "category": "painting",
        }, headers={"X-User-ID": "poster-list-2"})

        response = await client.get("/")
        assert response.status_code == 200
        listings = response.json()
        assert len(listings) >= 2

    async def test_list_filter_by_category(self, client):
        await client.post("/", json={
            "title": "Electrical work",
            "description": "Install ceiling fan.",
            "category": "electrical",
        }, headers={"X-User-ID": "poster-cat"})

        response = await client.get("/?category=electrical")
        assert response.status_code == 200
        listings = response.json()
        assert all(listing["category"] == "electrical" for listing in listings)


class TestListingFeed:
    async def test_feed_returns_listings(self, client):
        await client.post("/", json=VALID_LISTING, headers={"X-User-ID": "poster-feed"})

        response = await client.get("/feed", headers={"X-User-ID": "consumer-1"})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_feed_requires_auth(self, client):
        response = await client.get("/feed")
        assert response.status_code == 401


class TestGetListing:
    async def test_get_listing_by_id(self, client):
        create_resp = await client.post("/", json=VALID_LISTING, headers={"X-User-ID": "poster-get"})
        listing_id = create_resp.json()["id"]

        response = await client.get(f"/{listing_id}")
        assert response.status_code == 200
        assert response.json()["id"] == listing_id

    async def test_get_listing_not_found(self, client):
        response = await client.get("/nonexistent-id")
        assert response.status_code == 404


class TestUpdateListing:
    async def test_update_listing_owner(self, client):
        create_resp = await client.post("/", json=VALID_LISTING, headers={"X-User-ID": "poster-upd"})
        listing_id = create_resp.json()["id"]

        response = await client.put(f"/{listing_id}", json={
            "title": "Updated title",
        }, headers={"X-User-ID": "poster-upd"})

        assert response.status_code == 200
        assert response.json()["title"] == "Updated title"

    async def test_update_listing_non_owner_forbidden(self, client):
        create_resp = await client.post("/", json=VALID_LISTING, headers={"X-User-ID": "poster-own"})
        listing_id = create_resp.json()["id"]

        response = await client.put(f"/{listing_id}", json={
            "title": "Hijacked",
        }, headers={"X-User-ID": "not-the-owner"})

        assert response.status_code == 403


class TestDeleteListing:
    async def test_delete_listing_soft_deletes(self, client):
        create_resp = await client.post("/", json=VALID_LISTING, headers={"X-User-ID": "poster-del"})
        listing_id = create_resp.json()["id"]

        response = await client.delete(f"/{listing_id}", headers={"X-User-ID": "poster-del"})
        assert response.status_code == 204

        # Verify listing status is now cancelled
        get_resp = await client.get(f"/{listing_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["status"] == "cancelled"

    async def test_delete_listing_non_owner_forbidden(self, client):
        create_resp = await client.post("/", json=VALID_LISTING, headers={"X-User-ID": "poster-del2"})
        listing_id = create_resp.json()["id"]

        response = await client.delete(f"/{listing_id}", headers={"X-User-ID": "intruder"})
        assert response.status_code == 403


class TestAuthRequired:
    async def test_create_listing_without_header(self, client):
        response = await client.post("/", json=VALID_LISTING)
        assert response.status_code == 401

    async def test_update_listing_without_header(self, client):
        response = await client.put("/some-id", json={"title": "x"})
        assert response.status_code == 401

    async def test_delete_listing_without_header(self, client):
        response = await client.delete("/some-id")
        assert response.status_code == 401
