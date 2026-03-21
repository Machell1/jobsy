"""Add OAuth fields to users table and password_reset_otps table.

Revision ID: 002_oauth_reset
Revises: 001_initial
Create Date: 2026-03-11

"""

import sqlalchemy as sa

from alembic import op

revision = "002_oauth_reset"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Make phone and password_hash nullable for OAuth users ─────────
    op.alter_column("users", "phone", existing_type=sa.String(20), nullable=True)
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=True)

    # ── Add OAuth columns ────────────────────────────────────────────
    op.add_column("users", sa.Column("oauth_provider", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("oauth_id", sa.String(255), nullable=True))

    # Partial unique index: only applies when oauth_provider is set
    op.execute(
        "CREATE UNIQUE INDEX uq_oauth_provider_id ON users (oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL"
    )

    # At least one auth method must exist
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT ck_users_auth_method "
        "CHECK (password_hash IS NOT NULL OR oauth_provider IS NOT NULL)"
    )

    # ── Password reset OTPs table ────────────────────────────────────
    op.create_table(
        "password_reset_otps",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("otp_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reset_otp_phone", "password_reset_otps", ["phone", "used"])


def downgrade() -> None:
    op.drop_index("ix_reset_otp_phone", table_name="password_reset_otps")
    op.drop_table("password_reset_otps")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_auth_method")
    op.execute("DROP INDEX IF EXISTS uq_oauth_provider_id")
    op.drop_column("users", "oauth_id")
    op.drop_column("users", "oauth_provider")
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=False)
    op.alter_column("users", "phone", existing_type=sa.String(20), nullable=False)
