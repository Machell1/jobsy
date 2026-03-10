FROM python:3.11-slim

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY shared/pyproject.toml /build/pyproject.toml
COPY shared/ /build/shared/
RUN pip install --no-cache-dir /build

COPY gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY gateway/app/ ./app/

USER appuser


CMD uvicorn app.main:app --host :: --port ${PORT:-8000}
