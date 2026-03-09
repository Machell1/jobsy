"""Tests for chat service REST routes."""

import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from shared.database import get_db


@pytest_asyncio.fixture
async def client(db_override, mock_publish_event):
    from chat.app.main import app

    app.dependency_overrides[get_db] = db_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seeded_conversation(test_session):
    """Seed a conversation with messages."""
    from chat.app.models import Conversation, Message

    convo_id = str(uuid.uuid4())
    convo = Conversation(
        id=convo_id,
        match_id=str(uuid.uuid4()),
        user_a_id="user-a",
        user_b_id="user-b",
        created_at=datetime.now(timezone.utc),
    )
    test_session.add(convo)

    # Add some messages
    for i, (sender, content) in enumerate([
        ("user-a", "Hey, interested in your listing!"),
        ("user-b", "Sure, let's discuss details."),
        ("user-a", "What's your availability?"),
    ]):
        msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=convo_id,
            sender_id=sender,
            content=content,
            message_type="text",
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        test_session.add(msg)

    await test_session.commit()
    return convo


class TestListConversations:
    async def test_list_conversations_as_user_a(self, client, seeded_conversation):
        response = await client.get("/conversations", headers={"X-User-ID": "user-a"})
        assert response.status_code == 200
        convos = response.json()
        assert len(convos) == 1
        assert convos[0]["id"] == seeded_conversation.id
        assert convos[0]["other_user_id"] == "user-b"

    async def test_list_conversations_as_user_b(self, client, seeded_conversation):
        response = await client.get("/conversations", headers={"X-User-ID": "user-b"})
        assert response.status_code == 200
        convos = response.json()
        assert len(convos) == 1
        assert convos[0]["other_user_id"] == "user-a"

    async def test_list_conversations_empty_for_non_participant(self, client, seeded_conversation):
        response = await client.get("/conversations", headers={"X-User-ID": "user-c"})
        assert response.status_code == 200
        assert response.json() == []


class TestGetMessages:
    async def test_get_messages(self, client, seeded_conversation):
        response = await client.get(
            f"/conversations/{seeded_conversation.id}/messages",
            headers={"X-User-ID": "user-a"},
        )
        assert response.status_code == 200
        messages = response.json()
        assert len(messages) == 3
        assert messages[0]["content"] == "Hey, interested in your listing!"

    async def test_get_messages_forbidden_for_non_participant(self, client, seeded_conversation):
        response = await client.get(
            f"/conversations/{seeded_conversation.id}/messages",
            headers={"X-User-ID": "stranger"},
        )
        assert response.status_code == 403


class TestMarkRead:
    async def test_mark_messages_read(self, client, seeded_conversation):
        response = await client.put(
            f"/conversations/{seeded_conversation.id}/read",
            headers={"X-User-ID": "user-b"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    async def test_mark_read_forbidden_for_non_participant(self, client, seeded_conversation):
        response = await client.put(
            f"/conversations/{seeded_conversation.id}/read",
            headers={"X-User-ID": "stranger"},
        )
        assert response.status_code == 403


class TestAuthRequired:
    async def test_list_conversations_without_header(self, client):
        response = await client.get("/conversations")
        assert response.status_code == 401
