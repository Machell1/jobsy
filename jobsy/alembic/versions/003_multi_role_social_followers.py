"""Add multi-role support, social media links, follower system, and user tagging.

Revision ID: 003_multi_role_social
Revises: 002_oauth_reset
Create Date: 2026-03-12

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "003_multi_role_social"
down_revision = "002_oauth_reset"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Users: multi-role support ────────────────────────────────────
    op.add_column("users", sa.Column("roles", postgresql.JSONB(), server_default="[]"))
    op.add_column("users", sa.Column("active_role", sa.String(20), server_default="user"))

    # ── Profiles: role flags ─────────────────────────────────────────
    op.add_column("profiles", sa.Column("is_hirer", sa.Boolean(), server_default=sa.text("false")))
    op.add_column("profiles", sa.Column("is_advertiser", sa.Boolean(), server_default=sa.text("false")))

    # ── Profiles: social media links ─────────────────────────────────
    op.add_column("profiles", sa.Column("instagram_url", sa.String(500), nullable=True))
    op.add_column("profiles", sa.Column("twitter_url", sa.String(500), nullable=True))
    op.add_column("profiles", sa.Column("tiktok_url", sa.String(500), nullable=True))
    op.add_column("profiles", sa.Column("youtube_url", sa.String(500), nullable=True))
    op.add_column("profiles", sa.Column("linkedin_url", sa.String(500), nullable=True))
    op.add_column("profiles", sa.Column("portfolio_url", sa.String(500), nullable=True))

    # ── Profiles: follower counts ────────────────────────────────────
    op.add_column("profiles", sa.Column("follower_count", sa.Integer(), server_default="0"))
    op.add_column("profiles", sa.Column("following_count", sa.Integer(), server_default="0"))

    # ── Follows table ────────────────────────────────────────────────
    op.create_table(
        "follows",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("follower_id", sa.String(), nullable=False),
        sa.Column("following_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_follow_follower", "follows", ["follower_id"])
    op.create_index("idx_follow_following", "follows", ["following_id"])
    op.create_index("uq_follow_pair", "follows", ["follower_id", "following_id"], unique=True)

    # ── User tags table ──────────────────────────────────────────────
    op.create_table(
        "user_tags",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tagger_id", sa.String(), nullable=False),
        sa.Column("tagged_user_id", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(20), nullable=False),
        sa.Column("entity_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_tag_tagged_user", "user_tags", ["tagged_user_id"])
    op.create_index("idx_tag_entity", "user_tags", ["entity_type", "entity_id"])
    op.create_index(
        "uq_user_tag",
        "user_tags",
        ["tagger_id", "tagged_user_id", "entity_type", "entity_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("user_tags")
    op.drop_table("follows")
    op.drop_column("profiles", "following_count")
    op.drop_column("profiles", "follower_count")
    op.drop_column("profiles", "portfolio_url")
    op.drop_column("profiles", "linkedin_url")
    op.drop_column("profiles", "youtube_url")
    op.drop_column("profiles", "tiktok_url")
    op.drop_column("profiles", "twitter_url")
    op.drop_column("profiles", "instagram_url")
    op.drop_column("profiles", "is_advertiser")
    op.drop_column("profiles", "is_hirer")
    op.drop_column("users", "active_role")
    op.drop_column("users", "roles")
