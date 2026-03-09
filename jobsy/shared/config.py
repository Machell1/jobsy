"""Base configuration loaded from environment variables."""

import logging
import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://jobsy:localdev@localhost:5432/jobsy")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

_jwt_secret = os.getenv("JWT_SECRET", "")
if not _jwt_secret:
    if os.getenv("TESTING"):
        _jwt_secret = "test-secret"  # noqa: S105
    elif os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PRODUCTION"):
        raise RuntimeError("JWT_SECRET environment variable must be set in production")
    else:
        logging.warning("JWT_SECRET not set, using insecure default. Set JWT_SECRET in production!")
        _jwt_secret = "change-me-in-production"  # noqa: S105
JWT_SECRET = _jwt_secret

JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRY_MINUTES = 60
JWT_REFRESH_EXPIRY_DAYS = 30
