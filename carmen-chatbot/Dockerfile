# Carmen Chatbot (FastAPI) — production image
FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend

ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

EXPOSE 8000

# start_server.py binds 127.0.0.1 — use uvicorn directly for Docker
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
