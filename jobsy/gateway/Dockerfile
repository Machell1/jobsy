FROM python:3.11-slim

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY shared/pyproject.toml /build/pyproject.toml
COPY shared/ /build/shared/
RUN pip install --no-cache-dir /build

COPY gateway/requirements.txt .
# bust cache: add stripe + slack_sdk 2026-03-15
RUN pip install --no-cache-dir -r requirements.txt

COPY gateway/app/ ./app/
COPY gateway/migrate.py ./migrate.py

USER appuser

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
# Deploy trigger - Sun Mar 15 12:20:36 UTC 2026
