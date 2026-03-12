"""Base configuration loaded from environment variables."""

import logging
import os

from dotenv import load_dotenv

load_dotenv()


def _is_production() -> bool:
    """Detect production/Railway environment from common env vars."""
    return bool(
        os.getenv("RAILWAY_ENVIRONMENT")
        or os.getenv("RAILWAY_ENVIRONMENT_NAME")
        or os.getenv("RAILWAY_PROJECT_ID")
        or os.getenv("RAILWAY_SERVICE_ID")
        or os.getenv("PRODUCTION")
    )


DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    if _is_production():
        raise RuntimeError("DATABASE_URL environment variable must be set in production")
    else:
        DATABASE_URL = "postgresql+asyncpg://jobsy:localdev@localhost:5432/jobsy"
elif DATABASE_URL.startswith("postgresql://"):
    # Railway provides DATABASE_URL with 'postgresql://' prefix, but SQLAlchemy async
    # requires 'postgresql+asyncpg://'. Auto-convert for compatibility.
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
REDIS_URL = os.getenv("REDIS_URL", "")
if not REDIS_URL:
    if _is_production():
        _redis_host = os.getenv("REDIS_HOST", "")
        _redis_port = os.getenv("REDIS_PORT", "6379")
        if _redis_host:
            REDIS_URL = f"redis://{_redis_host}:{_redis_port}/0"
            logging.info("REDIS_URL built from REDIS_HOST=%s", _redis_host)
        else:
            raise RuntimeError(
                "REDIS_URL environment variable must be set in production. "
                "Set REDIS_URL or REDIS_HOST."
            )
    else:
        REDIS_URL = "redis://localhost:6379/0"

RABBITMQ_URL = os.getenv("RABBITMQ_URL") or os.getenv("CLOUDAMQP_URL", "")
if not RABBITMQ_URL:
    if _is_production():
        _rmq_host = os.getenv("RABBITMQ_HOST", "")
        _rmq_port = os.getenv("RABBITMQ_PORT", "5672")
        _rmq_user = os.getenv("RABBITMQ_USER", os.getenv("RABBITMQ_DEFAULT_USER", "guest"))
        _rmq_pass = os.getenv("RABBITMQ_PASS", os.getenv("RABBITMQ_DEFAULT_PASS", "guest"))
        _rmq_vhost = os.getenv("RABBITMQ_VHOST", "/")
        if _rmq_host:
            RABBITMQ_URL = f"amqp://{_rmq_user}:{_rmq_pass}@{_rmq_host}:{_rmq_port}/{_rmq_vhost}"
            logging.info("RABBITMQ_URL built from RABBITMQ_HOST=%s", _rmq_host)
        else:
            logging.warning(
                "RABBITMQ_URL not set in production. Set RABBITMQ_URL, CLOUDAMQP_URL, "
                "or RABBITMQ_HOST. Event publishing will retry until available."
            )
    else:
        RABBITMQ_URL = "amqp://guest:guest@localhost:5672/"

_jwt_secret = os.getenv("JWT_SECRET", "")
if not _jwt_secret:
    if os.getenv("TESTING"):
        _jwt_secret = "test-secret"  # noqa: S105
    elif _is_production():
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
    if _is_production():
        _es_host = os.getenv("ELASTICSEARCH_HOST", "")
        _es_port = os.getenv("ELASTICSEARCH_PORT", "9200")
        if _es_host:
            ELASTICSEARCH_URL = f"http://{_es_host}:{_es_port}"
            logging.info("ELASTICSEARCH_URL built from ELASTICSEARCH_HOST=%s", _es_host)
        else:
            logging.warning("ELASTICSEARCH_URL not set in production — search will be unavailable")
    else:
        ELASTICSEARCH_URL = "http://localhost:9200"

# Twilio SMS
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
