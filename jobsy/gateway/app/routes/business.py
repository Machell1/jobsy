"""Business Accounts routes embedded directly in the gateway."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..deps import get_current_user
from ..models_business import BusinessBranch, BusinessProfile, BusinessStaff

router = APIRouter(tags=["business"])


# --- Request schemas ---


class BusinessRegister(BaseModel):
    business_name: str = Field(..., max_length=200)
    registration_number: str | None = None
    address: str | None = None
    parish: str | None = Field(default=None, max_length=50)
    contact_email: str | None = None
    contact_phone: str | None = None
    description: str | None = None
    logo_url: str | None = None


class BusinessUpdate(BaseModel):
    business_name: str | None = Field(default=None, max_length=200)
    registration_number: str | None = None
    address: str | None = None
    parish: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    description: str | None = None
    logo_url: str | None = None
    website: str | None = None


class StaffAdd(BaseModel):
    user_id: str
    role: str = Field(default="staff", pattern=r"^(admin|manager|staff)$")


class StaffRoleUpdate(BaseModel):
    role: str = Field(..., pattern=r"^(admin|manager|staff)$")


class BranchCreate(BaseModel):
    name: str = Field(..., max_length=200, alias="branch_name")
    address: str | None = None
    parish: str | None = None
    phone: str | None = None
    manager_id: str | None = None

    model_config = {"populate_by_name": True}


class BranchUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    address: str | None = None
    parish: str | None = None
    phone: str | None = None
    manager_id: str | None = None
    is_active: bool | None = None


# --- Helpers ---


async def _get_my_business(user_id: str, db: AsyncSession) -> BusinessProfile:
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found",
        )
    return biz


# --- Routes ---


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_business(
    data: BusinessRegister,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a new business account."""
    # Check if user already has a business
    existing = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user["user_id"]))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Business profile already exists",
        )

    now = datetime.now(UTC)
    biz = BusinessProfile(
        id=str(uuid.uuid4()),
        user_id=user["user_id"],
        business_name=data.business_name,
        registration_number=data.registration_number,
        address=data.address,
        parish=data.parish,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        description=data.description,
        logo_url=data.logo_url,
        created_at=now,
        updated_at=now,
    )
    db.add(biz)
    await db.flush()
    return {"id": biz.id, "business_name": biz.business_name}


@router.get("/me")
async def get_my_business(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get my business profile."""
    biz = await _get_my_business(user["user_id"], db)
    return {
        "id": biz.id,
        "business_name": biz.business_name,
        "registration_number": biz.registration_number,
        "address": biz.address,
        "parish": biz.parish,
        "contact_email": biz.contact_email,
        "contact_phone": biz.contact_phone,
        "description": biz.description,
        "logo_url": biz.logo_url,
        "website": biz.website,
        "is_verified": biz.is_verified,
        "created_at": biz.created_at.isoformat(),
        "updated_at": biz.updated_at.isoformat(),
    }


@router.put("/me")
async def update_my_business(
    data: BusinessUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update my business profile."""
    biz = await _get_my_business(user["user_id"], db)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(biz, field, value)
    biz.updated_at = datetime.now(UTC)
    await db.flush()
    return {"id": biz.id, "business_name": biz.business_name}


@router.post("/staff", status_code=status.HTTP_201_CREATED)
async def add_staff(
    data: StaffAdd,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a staff member to the business."""
    biz = await _get_my_business(user["user_id"], db)

    existing = await db.execute(
        select(BusinessStaff).where(
            BusinessStaff.business_id == biz.id,
            BusinessStaff.user_id == data.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Staff member already exists")

    now = datetime.now(UTC)
    staff = BusinessStaff(
        id=str(uuid.uuid4()),
        business_id=biz.id,
        user_id=data.user_id,
        role=data.role,
        invited_at=now,
        created_at=now,
    )
    db.add(staff)
    await db.flush()
    return {"id": staff.id, "user_id": data.user_id, "role": data.role}


@router.get("/staff")
async def list_staff(
    user: dict = Depends(get_current_user),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List staff members of the business."""
    biz = await _get_my_business(user["user_id"], db)

    query = (
        select(BusinessStaff)
        .where(BusinessStaff.business_id == biz.id)
        .order_by(BusinessStaff.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    staff = result.scalars().all()
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "role": s.role,
            "is_active": s.is_active,
            "invited_at": s.invited_at.isoformat(),
            "accepted_at": s.accepted_at.isoformat() if s.accepted_at else None,
        }
        for s in staff
    ]


@router.delete("/staff/{staff_user_id}")
async def remove_staff(
    staff_user_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a staff member from the business."""
    biz = await _get_my_business(user["user_id"], db)

    result = await db.execute(
        select(BusinessStaff).where(
            BusinessStaff.business_id == biz.id,
            BusinessStaff.user_id == staff_user_id,
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    await db.delete(staff)
    await db.flush()
    return {"status": "removed", "user_id": staff_user_id}


@router.put("/staff/{staff_user_id}/role")
async def update_staff_role(
    staff_user_id: str,
    data: StaffRoleUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change a staff member's role."""
    biz = await _get_my_business(user["user_id"], db)

    result = await db.execute(
        select(BusinessStaff).where(
            BusinessStaff.business_id == biz.id,
            BusinessStaff.user_id == staff_user_id,
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    staff.role = data.role
    await db.flush()
    return {"user_id": staff_user_id, "role": data.role}


@router.post("/branches", status_code=status.HTTP_201_CREATED)
async def create_branch(
    data: BranchCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new branch."""
    biz = await _get_my_business(user["user_id"], db)

    now = datetime.now(UTC)
    branch = BusinessBranch(
        id=str(uuid.uuid4()),
        business_id=biz.id,
        branch_name=data.name,
        address=data.address,
        parish=data.parish,
        phone=data.phone,
        manager_id=data.manager_id,
        created_at=now,
        updated_at=now,
    )
    db.add(branch)
    await db.flush()
    return {"id": branch.id, "branch_name": branch.branch_name}


@router.get("/branches")
async def list_branches(
    user: dict = Depends(get_current_user),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List branches of the business."""
    biz = await _get_my_business(user["user_id"], db)

    query = (
        select(BusinessBranch)
        .where(BusinessBranch.business_id == biz.id, BusinessBranch.is_active.is_(True))
        .order_by(BusinessBranch.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    branches = result.scalars().all()
    return [
        {
            "id": b.id,
            "branch_name": b.branch_name,
            "address": b.address,
            "parish": b.parish,
            "phone": b.phone,
            "manager_id": b.manager_id,
            "is_active": b.is_active,
            "created_at": b.created_at.isoformat(),
        }
        for b in branches
    ]


@router.put("/branches/{branch_id}")
async def update_branch(
    branch_id: str,
    data: BranchUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a branch."""
    biz = await _get_my_business(user["user_id"], db)

    result = await db.execute(
        select(BusinessBranch).where(
            BusinessBranch.id == branch_id,
            BusinessBranch.business_id == biz.id,
        )
    )
    branch = result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "name":
            branch.branch_name = value
        else:
            setattr(branch, field, value)
    branch.updated_at = datetime.now(UTC)
    await db.flush()
    return {"id": branch.id, "branch_name": branch.branch_name}


@router.delete("/branches/{branch_id}")
async def remove_branch(
    branch_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove (deactivate) a branch."""
    biz = await _get_my_business(user["user_id"], db)

    result = await db.execute(
        select(BusinessBranch).where(
            BusinessBranch.id == branch_id,
            BusinessBranch.business_id == biz.id,
        )
    )
    branch = result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    branch.is_active = False
    branch.updated_at = datetime.now(UTC)
    await db.flush()
    return {"status": "removed", "branch_id": branch_id}


@router.get("/calendar")
async def team_calendar(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated team calendar (availability of all staff)."""
    biz = await _get_my_business(user["user_id"], db)

    query = select(BusinessStaff).where(
        BusinessStaff.business_id == biz.id,
        BusinessStaff.is_active.is_(True),
    )
    result = await db.execute(query)
    staff = result.scalars().all()

    return {
        "business_id": biz.id,
        "business_name": biz.business_name,
        "staff_count": len(staff),
        "staff": [{"user_id": s.user_id, "role": s.role} for s in staff],
    }
