"""Base configuration loaded from environment variables."""

import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://jobsy:localdev@localhost:5432/jobsy")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRY_MINUTES = 60
JWT_REFRESH_EXPIRY_DAYS = 30
