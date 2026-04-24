# Build context: repository root (see docker-compose.yml / render.yaml)
FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY carmen-chatbot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY carmen-chatbot/backend ./backend
COPY contents/training_center/carmen_cloud ./carmen_cloud

ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV WIKI_CONTENT_PATH=/app/carmen_cloud

EXPOSE 8000
ENV PORT=8000

# Render / PaaS: listen on $PORT (default 8000)
CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
