FROM python:3.11-slim

WORKDIR /app

COPY shared/pyproject.toml /build/pyproject.toml
COPY shared/ /build/shared/
RUN pip install --no-cache-dir /build

COPY recommendations/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY recommendations/app/ ./app/

CMD uvicorn app.main:app --host :: --port ${PORT:-8000}
