"""SQLAlchemy ORM models for Business Accounts (embedded in gateway)."""

from sqlalchemy import Boolean, Column, DateTime, Index, String, Text, UniqueConstraint

from shared.database import Base


class BusinessProfile(Base):
    """A registered business account."""

    __tablename__ = "business_profiles"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    business_name = Column(String(200), nullable=False)
    registration_number = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    parish = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(30), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(Text, nullable=True)
    website = Column(String(500), nullable=True)
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_business_user", "user_id"),
        {"extend_existing": True},
    )


class BusinessStaff(Base):
    """A staff member linked to a business."""

    __tablename__ = "business_staff"

    id = Column(String, primary_key=True)
    business_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    role = Column(String(20), nullable=False, default="staff")
    is_active = Column(Boolean, default=True)
    invited_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "user_id"),
        Index("idx_staff_business", "business_id"),
        Index("idx_staff_user", "user_id"),
        {"extend_existing": True},
    )


class BusinessBranch(Base):
    """A physical branch of a business."""

    __tablename__ = "business_branches"

    id = Column(String, primary_key=True)
    business_id = Column(String, nullable=False)
    branch_name = Column(String(200), nullable=False)
    address = Column(Text, nullable=True)
    parish = Column(String(50), nullable=True)
    phone = Column(String(30), nullable=True)
    manager_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_branch_business", "business_id"),
        {"extend_existing": True},
    )
