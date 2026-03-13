"""SQLAlchemy ORM models for the noticeboard service (embedded in gateway)."""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from shared.database import Base


class NoticeBoard(Base):
    """A provider's notice board."""

    __tablename__ = "notice_boards"

    id = Column(String, primary_key=True)
    provider_id = Column(String, unique=True, nullable=False)
    user_id = Column(String, nullable=False)
    is_enabled = Column(Boolean, default=True)
    post_count = Column(Integer, default=0)
    follower_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_noticeboard_user", "user_id"),
        Index("idx_noticeboard_provider", "provider_id"),
        {"extend_existing": True},
    )


class Post(Base):
    """A post on a notice board."""

    __tablename__ = "posts"

    id = Column(String, primary_key=True)
    notice_board_id = Column(String, nullable=False)
    author_id = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    media_urls = Column(JSONB, default=[])
    media_type = Column(String(20), nullable=True)
    external_link = Column(String(500), nullable=True)
    post_type = Column(String(20), default="standard")
    profession_tag = Column(String(100), nullable=True)
    moderation_status = Column(String(20), default="pending_review")
    moderation_note = Column(Text, nullable=True)
    moderation_reviewed_by = Column(String, nullable=True)
    moderation_reviewed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_post_noticeboard", "notice_board_id"),
        Index("idx_post_author", "author_id"),
        Index("idx_post_moderation", "moderation_status"),
        Index("idx_post_created", "created_at"),
        {"extend_existing": True},
    )


class Comment(Base):
    """A comment on a post."""

    __tablename__ = "comments"

    id = Column(String, primary_key=True)
    post_id = Column(String, nullable=False)
    author_id = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    parent_comment_id = Column(String, nullable=True)
    moderation_status = Column(String(20), default="pending_review")
    moderation_note = Column(Text, nullable=True)
    like_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_comment_post", "post_id"),
        Index("idx_comment_author", "author_id"),
        Index("idx_comment_moderation", "moderation_status"),
        {"extend_existing": True},
    )


class PostLike(Base):
    """A like on a post or comment."""

    __tablename__ = "post_likes"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    target_type = Column(String(10), nullable=False)
    target_id = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "target_type",
            "target_id",
            name="uq_post_likes_user_target",
        ),
        Index("idx_like_user", "user_id"),
        Index("idx_like_target", "target_id"),
        {"extend_existing": True},
    )
