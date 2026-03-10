FROM python:3.11-slim

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY bot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot/ .

USER appuser

CMD ["python", "telegram_bot.py"]
