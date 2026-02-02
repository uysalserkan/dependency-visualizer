# Stage 1: build Go extractor (context = repo root)
FROM golang:1.21-alpine AS extractor-builder
COPY extractor /build/extractor
WORKDIR /build/extractor
RUN go build -o /extractor-binary .

# Stage 2: Python backend
FROM python:3.11-slim

WORKDIR /app

# Install git for repository clone (POST /api/analyze/repository)
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# Copy Go extractor binary from builder
COPY --from=extractor-builder /extractor-binary /usr/local/bin/extractor
RUN chmod +x /usr/local/bin/extractor

# Install uv
RUN pip install uv

# Copy dependency files (paths relative to repo root when context is .)
COPY backend/pyproject.toml ./

# Install dependencies
RUN uv sync --no-dev

# Copy application code
COPY backend/app ./app

# Use Go extractor for faster parsing (optional: override with env to disable)
ENV GO_EXTRACTOR_PATH=/usr/local/bin/extractor

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
