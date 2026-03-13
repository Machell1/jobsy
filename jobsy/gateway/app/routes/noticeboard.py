"""Notice board routes embedded directly in the gateway."""

import uuid
from datetime import UTC, datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db

from ..deps import get_current_user, get_optional_user
from ..models_noticeboard import Comment, NoticeBoard, Post, PostLike

router = APIRouter(tags=["noticeboard"])


# --- Request schemas ---
class BoardUpdate(BaseModel):
    is_enabled: bool


class PostCreate(BaseModel):
    content: str
    media_urls: list[str] | None = None
    media_type: str | None = Field(
        default=None,
        max_length=20,
    )
    external_link: str | None = Field(
        default=None,
        max_length=500,
    )
    post_type: str = Field(
        default="standard",
        max_length=20,
    )
    profession_tag: str | None = Field(
        default=None,
        max_length=100,
    )


class PostUpdate(BaseModel):
    content: str | None = None
    media_urls: list[str] | None = None


class CommentCreate(BaseModel):
    content: str
    parent_comment_id: str | None = None


class LikeRequest(BaseModel):
    target_type: str = Field(
        ...,
        pattern="^(post|comment)$",
    )
    target_id: str


class ModerationReview(BaseModel):
    decision: str = Field(
        ...,
        pattern="^(approve|decline|hide)$",
    )
    moderation_note: str | None = None


# --- Helpers ---
def _board_response(b: NoticeBoard) -> dict:
    return {
        "id": b.id,
        "provider_id": b.provider_id,
        "user_id": b.user_id,
        "is_enabled": b.is_enabled,
        "post_count": b.post_count,
        "follower_count": b.follower_count,
        "created_at": b.created_at.isoformat(),
        "updated_at": b.updated_at.isoformat(),
    }


def _post_response(p: Post) -> dict:
    return {
        "id": p.id,
        "notice_board_id": p.notice_board_id,
        "author_id": p.author_id,
        "content": p.content,
        "media_urls": p.media_urls or [],
        "media_type": p.media_type,
        "external_link": p.external_link,
        "post_type": p.post_type,
        "profession_tag": p.profession_tag,
        "moderation_status": p.moderation_status,
        "moderation_note": p.moderation_note,
        "like_count": p.like_count,
        "comment_count": p.comment_count,
        "is_pinned": p.is_pinned,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }


def _comment_response(c: Comment) -> dict:
    return {
        "id": c.id,
        "post_id": c.post_id,
        "author_id": c.author_id,
        "content": c.content,
        "parent_comment_id": c.parent_comment_id,
        "moderation_status": c.moderation_status,
        "like_count": c.like_count,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }


# --- Notice Board Routes ---


@router.post("/boards", status_code=status.HTTP_201_CREATED)
async def create_board(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enable a notice board for the current provider."""
    user_id = user["user_id"]
    now = datetime.now(UTC)

    result = await db.execute(
        select(NoticeBoard).where(
            NoticeBoard.user_id == user_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Notice board already exists",
        )

    board = NoticeBoard(
        id=str(uuid.uuid4()),
        provider_id=user_id,
        user_id=user_id,
        is_enabled=True,
        post_count=0,
        follower_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(board)
    await db.flush()

    return _board_response(board)


@router.get("/boards/me")
async def get_my_board(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current provider's notice board."""
    user_id = user["user_id"]
    result = await db.execute(
        select(NoticeBoard).where(
            NoticeBoard.user_id == user_id,
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice board not found",
        )
    return _board_response(board)


@router.get("/boards/{user_id}")
async def get_board(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a provider's public notice board."""
    result = await db.execute(
        select(NoticeBoard).where(
            NoticeBoard.user_id == user_id,
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice board not found",
        )
    return _board_response(board)


@router.put("/boards/me")
async def update_board(
    data: BoardUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update board settings (enable/disable)."""
    user_id = user["user_id"]
    result = await db.execute(
        select(NoticeBoard).where(
            NoticeBoard.user_id == user_id,
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice board not found",
        )

    board.is_enabled = data.is_enabled
    board.updated_at = datetime.now(UTC)
    await db.flush()
    return _board_response(board)


# --- Post Routes ---


@router.post("/posts", status_code=status.HTTP_201_CREATED)
async def create_post(
    data: PostCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new post (goes to pending_review)."""
    user_id = user["user_id"]

    result = await db.execute(
        select(NoticeBoard).where(
            NoticeBoard.user_id == user_id,
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No notice board found. Create one first.",
        )

    now = datetime.now(UTC)
    post = Post(
        id=str(uuid.uuid4()),
        notice_board_id=board.id,
        author_id=user_id,
        content=data.content,
        media_urls=data.media_urls or [],
        media_type=data.media_type,
        external_link=data.external_link,
        post_type=data.post_type,
        profession_tag=data.profession_tag,
        moderation_status="pending_review",
        like_count=0,
        comment_count=0,
        is_pinned=False,
        created_at=now,
        updated_at=now,
    )
    db.add(post)

    board.post_count = board.post_count + 1
    board.updated_at = now
    await db.flush()

    return _post_response(post)


@router.get("/posts/mine")
async def list_my_posts(
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's posts (all statuses)."""
    user_id = user["user_id"]
    offset = (page - 1) * limit

    query = select(Post).where(Post.author_id == user_id)
    if status_filter:
        query = query.where(
            Post.moderation_status == status_filter,
        )
    query = (
        query.order_by(
            Post.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    posts = result.scalars().all()
    return [_post_response(p) for p in posts]


@router.get("/posts/feed")
async def public_feed(
    category: str | None = Query(default=None),
    parish: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    _user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Public feed of approved posts."""
    offset = (page - 1) * limit

    query = select(Post).where(
        Post.moderation_status == "approved",
    )
    if category:
        query = query.where(Post.post_type == category)
    if parish:
        query = query.where(Post.profession_tag == parish)
    query = (
        query.order_by(
            Post.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    posts = result.scalars().all()
    return [_post_response(p) for p in posts]


@router.get("/posts/{post_id}")
async def get_post(
    post_id: str,
    _user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get post detail."""
    result = await db.execute(
        select(Post).where(Post.id == post_id),
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )
    return _post_response(post)


@router.put("/posts/{post_id}")
async def update_post(
    post_id: str,
    data: PostUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit a post. Resets to pending_review if approved."""
    user_id = user["user_id"]

    result = await db.execute(
        select(Post).where(Post.id == post_id),
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )
    if post.author_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this post",
        )

    now = datetime.now(UTC)
    if data.content is not None:
        post.content = data.content
    if data.media_urls is not None:
        post.media_urls = data.media_urls

    if post.moderation_status == "approved":
        post.moderation_status = "pending_review"

    post.updated_at = now
    await db.flush()
    return _post_response(post)


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a post (set status to hidden)."""
    user_id = user["user_id"]

    result = await db.execute(
        select(Post).where(Post.id == post_id),
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )
    if post.author_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post",
        )

    post.moderation_status = "hidden"
    post.updated_at = datetime.now(UTC)
    await db.flush()
    return {"status": "hidden", "post_id": post_id}


@router.post("/posts/{post_id}/resubmit")
async def resubmit_post(
    post_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resubmit a declined post for review."""
    user_id = user["user_id"]

    result = await db.execute(
        select(Post).where(Post.id == post_id),
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )
    if post.author_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )
    if post.moderation_status != "declined":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only declined posts can be resubmitted",
        )

    post.moderation_status = "pending_review"
    post.moderation_note = None
    post.updated_at = datetime.now(UTC)
    await db.flush()
    return _post_response(post)


# --- Comment Routes ---


@router.post(
    "/posts/{post_id}/comments",
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    post_id: str,
    data: CommentCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a comment to a post."""
    user_id = user["user_id"]

    result = await db.execute(
        select(Post).where(Post.id == post_id),
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    now = datetime.now(UTC)
    comment = Comment(
        id=str(uuid.uuid4()),
        post_id=post_id,
        author_id=user_id,
        content=data.content,
        parent_comment_id=data.parent_comment_id,
        moderation_status="pending_review",
        like_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(comment)

    await db.execute(
        text("UPDATE posts SET comment_count = comment_count + 1 WHERE id = :post_id"),
        {"post_id": post_id},
    )
    await db.flush()

    return _comment_response(comment)


@router.get("/posts/{post_id}/comments")
async def list_comments(
    post_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    _user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """List approved comments for a post."""
    offset = (page - 1) * limit
    result = await db.execute(
        select(Comment)
        .where(
            Comment.post_id == post_id,
            Comment.moderation_status == "approved",
        )
        .order_by(Comment.created_at)
        .offset(offset)
        .limit(limit)
    )
    comments = result.scalars().all()
    return [_comment_response(c) for c in comments]


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a comment."""
    user_id = user["user_id"]

    result = await db.execute(
        select(Comment).where(Comment.id == comment_id),
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )
    if comment.author_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )

    comment.moderation_status = "hidden"
    comment.updated_at = datetime.now(UTC)
    await db.flush()
    return {"status": "hidden", "comment_id": comment_id}


# --- Like Routes ---


@router.post("/like", status_code=status.HTTP_201_CREATED)
async def like_target(
    data: LikeRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Like a post or comment."""
    user_id = user["user_id"]

    result = await db.execute(
        select(PostLike).where(
            PostLike.user_id == user_id,
            PostLike.target_type == data.target_type,
            PostLike.target_id == data.target_id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already liked",
        )

    like = PostLike(
        id=str(uuid.uuid4()),
        user_id=user_id,
        target_type=data.target_type,
        target_id=data.target_id,
        created_at=datetime.now(UTC),
    )
    db.add(like)

    if data.target_type == "post":
        await db.execute(
            text("UPDATE posts SET like_count = like_count + 1 WHERE id = :target_id"),
            {"target_id": data.target_id},
        )
    else:
        await db.execute(
            text("UPDATE comments SET like_count = like_count + 1 WHERE id = :target_id"),
            {"target_id": data.target_id},
        )
    await db.flush()

    return {
        "status": "liked",
        "target_type": data.target_type,
        "target_id": data.target_id,
    }


@router.delete("/like")
async def unlike_target(
    data: LikeRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unlike a post or comment."""
    user_id = user["user_id"]

    result = await db.execute(
        select(PostLike).where(
            PostLike.user_id == user_id,
            PostLike.target_type == data.target_type,
            PostLike.target_id == data.target_id,
        )
    )
    like = result.scalar_one_or_none()
    if not like:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Like not found",
        )

    await db.delete(like)

    if data.target_type == "post":
        await db.execute(
            text("UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = :target_id"),
            {"target_id": data.target_id},
        )
    else:
        await db.execute(
            text("UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = :target_id"),
            {"target_id": data.target_id},
        )
    await db.flush()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Moderation Routes ---


@router.get("/moderation/pending")
async def list_pending(
    item_type: str = Query(
        default="post",
        alias="type",
    ),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    _user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List pending posts/comments for moderation."""
    offset = (page - 1) * limit

    if item_type == "comment":
        result = await db.execute(
            select(Comment)
            .where(
                Comment.moderation_status == "pending_review",
            )
            .order_by(Comment.created_at)
            .offset(offset)
            .limit(limit)
        )
        items = result.scalars().all()
        return [_comment_response(c) for c in items]
    else:
        result = await db.execute(
            select(Post)
            .where(
                Post.moderation_status == "pending_review",
            )
            .order_by(Post.created_at)
            .offset(offset)
            .limit(limit)
        )
        items = result.scalars().all()
        return [_post_response(p) for p in items]


@router.post("/moderation/{item_type}/{item_id}/review")
async def review_item(
    item_type: str,
    item_id: str,
    data: ModerationReview,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Review a post or comment (approve/decline/hide)."""
    reviewer_id = user["user_id"]
    now = datetime.now(UTC)

    status_map = {
        "approve": "approved",
        "decline": "declined",
        "hide": "hidden",
    }
    new_status = status_map[data.decision]

    if item_type == "post":
        result = await db.execute(
            select(Post).where(Post.id == item_id),
        )
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found",
            )
        item.moderation_status = new_status
        item.moderation_note = data.moderation_note
        item.moderation_reviewed_by = reviewer_id
        item.moderation_reviewed_at = now
        item.updated_at = now
        await db.flush()
        return _post_response(item)
    elif item_type == "comment":
        result = await db.execute(
            select(Comment).where(Comment.id == item_id),
        )
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found",
            )
        item.moderation_status = new_status
        item.moderation_note = data.moderation_note
        item.updated_at = now
        await db.flush()
        return _comment_response(item)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid item type",
        )
