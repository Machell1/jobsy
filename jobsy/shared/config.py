"""Base configuration loaded from environment variables."""

import logging
import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PRODUCTION"):
        raise RuntimeError("DATABASE_URL environment variable must be set in production")
    else:
        DATABASE_URL = "postgresql+asyncpg://jobsy:localdev@localhost:5432/jobsy"
elif DATABASE_URL.startswith("postgresql://"):
    # Railway provides DATABASE_URL with 'postgresql://' prefix, but SQLAlchemy async
    # requires 'postgresql+asyncpg://'. Auto-convert for compatibility.
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
REDIS_URL = os.getenv("REDIS_URL", "")
if not REDIS_URL:
    if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PRODUCTION"):
        raise RuntimeError("REDIS_URL environment variable must be set in production")
    else:
        REDIS_URL = "redis://localhost:6379/0"

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "")
if not RABBITMQ_URL:
    if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PRODUCTION"):
        logging.warning("RABBITMQ_URL not set in production — event publishing will be disabled")
    else:
        RABBITMQ_URL = "amqp://guest:guest@localhost:5672/"

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
JWT_ACCESS_EXPIRY_MINUTES = int(os.getenv("JWT_ACCESS_EXPIRY_MINUTES", "60"))
JWT_REFRESH_EXPIRY_DAYS = int(os.getenv("JWT_REFRESH_EXPIRY_DAYS", "30"))

# OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
APPLE_BUNDLE_ID = os.getenv("APPLE_BUNDLE_ID", "com.jobsy.app")

# Elasticsearch
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "")
if not ELASTICSEARCH_URL:
    if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PRODUCTION"):
        logging.warning("ELASTICSEARCH_URL not set in production — search will be unavailable")
    else:
        ELASTICSEARCH_URL = "http://localhost:9200"

# Twilio SMS
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
