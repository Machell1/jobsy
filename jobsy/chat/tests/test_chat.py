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
    """Seed a conversation between two users with messages."""
    from chat.app.models import Conversation, Message

    convo_id = str(uuid.uuid4())
    conversation = Conversation(
        id=convo_id,
        match_id=str(uuid.uuid4()),
        user_a_id="user-a",
        user_b_id="user-b",
        created_at=datetime.now(timezone.utc),
    )
    test_session.add(conversation)

    # Add some messages
    for sender, content in [
        ("user-a", "Hey, interested in the job!"),
        ("user-b", "Sure, let's discuss details."),
        ("user-a", "When are you available?"),
    ]:
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
    return conversation


class TestListConversations:
    async def test_list_conversations_as_user_a(self, client, seeded_conversation):
        response = await client.get("/conversations", headers={"X-User-ID": "user-a"})
        assert response.status_code == 200
        conversations = response.json()
        assert len(conversations) == 1
        assert conversations[0]["id"] == seeded_conversation.id
        assert conversations[0]["other_user_id"] == "user-b"

    async def test_list_conversations_as_user_b(self, client, seeded_conversation):
        response = await client.get("/conversations", headers={"X-User-ID": "user-b"})
        assert response.status_code == 200
        conversations = response.json()
        assert len(conversations) == 1
        assert conversations[0]["other_user_id"] == "user-a"

    async def test_list_conversations_empty_for_non_participant(self, client, seeded_conversation):
        response = await client.get("/conversations", headers={"X-User-ID": "user-c"})
        assert response.status_code == 200
        assert response.json() == []


class TestGetMessages:
    async def test_get_messages_as_participant(self, client, seeded_conversation):
        response = await client.get(
            f"/conversations/{seeded_conversation.id}/messages",
            headers={"X-User-ID": "user-a"},
        )
        assert response.status_code == 200
        messages = response.json()
        assert len(messages) == 3
        # Messages should be returned oldest first
        assert messages[0]["content"] == "Hey, interested in the job!"
        assert messages[2]["content"] == "When are you available?"

    async def test_get_messages_as_user_b(self, client, seeded_conversation):
        response = await client.get(
            f"/conversations/{seeded_conversation.id}/messages",
            headers={"X-User-ID": "user-b"},
        )
        assert response.status_code == 200
        assert len(response.json()) == 3

    async def test_get_messages_forbidden_for_non_participant(self, client, seeded_conversation):
        response = await client.get(
            f"/conversations/{seeded_conversation.id}/messages",
            headers={"X-User-ID": "stranger"},
        )
        assert response.status_code == 403


class TestMarkMessagesRead:
    async def test_mark_messages_read(self, client, seeded_conversation):
        # user-b marks messages as read (messages from user-a should be marked)
        response = await client.put(
            f"/conversations/{seeded_conversation.id}/read",
            headers={"X-User-ID": "user-b"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

        # Verify messages from user-a are now marked as read
        msg_response = await client.get(
            f"/conversations/{seeded_conversation.id}/messages",
            headers={"X-User-ID": "user-b"},
        )
        messages = msg_response.json()
        for msg in messages:
            if msg["sender_id"] == "user-a":
                assert msg["is_read"] is True
            # Messages from user-b should remain unread (no one marked them)
            if msg["sender_id"] == "user-b":
                assert msg["is_read"] is False

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

    async def test_get_messages_without_header(self, client, seeded_conversation):
        response = await client.get(f"/conversations/{seeded_conversation.id}/messages")
        assert response.status_code == 401

    async def test_mark_read_without_header(self, client, seeded_conversation):
        response = await client.put(f"/conversations/{seeded_conversation.id}/read")
        assert response.status_code == 401
