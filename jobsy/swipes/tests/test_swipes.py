"""Tests for swipes service routes."""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from shared.database import get_db


@pytest_asyncio.fixture
async def client(db_override, mock_publish_event):
    from swipes.app.main import app

    app.dependency_overrides[get_db] = db_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


VALID_SWIPE = {
    "target_id": "listing-abc",
    "target_type": "listing",
    "direction": "right",
}


class TestRecordSwipe:
    async def test_record_swipe_success(self, client):
        response = await client.post("/", json=VALID_SWIPE, headers={"X-User-ID": "swiper-1"})

        assert response.status_code == 201
        data = response.json()
        assert data["swiper_id"] == "swiper-1"
        assert data["target_id"] == "listing-abc"
        assert data["target_type"] == "listing"
        assert data["direction"] == "right"
        assert "id" in data

    async def test_record_swipe_left(self, client):
        response = await client.post("/", json={
            "target_id": "profile-xyz",
            "target_type": "profile",
            "direction": "left",
        }, headers={"X-User-ID": "swiper-2"})

        assert response.status_code == 201
        assert response.json()["direction"] == "left"

    async def test_duplicate_swipe_conflict(self, client):
        headers = {"X-User-ID": "swiper-dup"}
        swipe_data = {
            "target_id": "listing-dup",
            "target_type": "listing",
            "direction": "right",
        }

        first = await client.post("/", json=swipe_data, headers=headers)
        assert first.status_code == 201

        second = await client.post("/", json=swipe_data, headers=headers)
        assert second.status_code == 409

    async def test_invalid_direction_rejected(self, client):
        response = await client.post("/", json={
            "target_id": "listing-bad",
            "target_type": "listing",
            "direction": "up",
        }, headers={"X-User-ID": "swiper-bad"})
        assert response.status_code == 422

    async def test_invalid_target_type_rejected(self, client):
        response = await client.post("/", json={
            "target_id": "listing-bad",
            "target_type": "invalid",
            "direction": "right",
        }, headers={"X-User-ID": "swiper-bad2"})
        assert response.status_code == 422


class TestSwipeHistory:
    async def test_get_swipe_history(self, client):
        headers = {"X-User-ID": "swiper-hist"}
        # Create some swipes
        await client.post("/", json={
            "target_id": "listing-h1",
            "target_type": "listing",
            "direction": "right",
        }, headers=headers)
        await client.post("/", json={
            "target_id": "profile-h2",
            "target_type": "profile",
            "direction": "left",
        }, headers=headers)

        response = await client.get("/history", headers=headers)
        assert response.status_code == 200
        history = response.json()
        assert len(history) == 2

    async def test_history_empty_for_new_user(self, client):
        response = await client.get("/history", headers={"X-User-ID": "swiper-new"})
        assert response.status_code == 200
        assert response.json() == []


class TestAuthRequired:
    async def test_record_swipe_without_header(self, client):
        response = await client.post("/", json=VALID_SWIPE)
        assert response.status_code == 401

    async def test_history_without_header(self, client):
        response = await client.get("/history")
        assert response.status_code == 401
