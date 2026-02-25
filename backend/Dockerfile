# Stage 1: build Go extractor (context = repo root)
# Use BUILDPLATFORM so Go compiler runs natively (avoids lfstack.push crash when
# building linux/amd64 on ARM64 via QEMU). Cross-compile for TARGETPLATFORM.
FROM --platform=$BUILDPLATFORM golang:1.22-alpine AS extractor-builder
COPY extractor /build/extractor
WORKDIR /build/extractor
ARG TARGETOS TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /extractor-binary .

# Stage 2: Python backend
FROM python:3.11-slim

WORKDIR /app

# Install git for repository clone (POST /api/analyze/repository)
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# Copy Go extractor binary from builder
COPY --from=extractor-builder /extractor-binary /usr/local/bin/extractor
RUN chmod +x /usr/local/bin/extractor

# Copy dependency files (paths relative to repo root when context is .)
COPY backend/pyproject.toml backend/requirements.txt ./

# Install dependencies (use pip instead of uv - uv segfaults under QEMU when cross-building amd64 on ARM64)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/app ./app
COPY backend/gunicorn_conf.py ./gunicorn_conf.py

# Use Go extractor for faster parsing (optional: override with env to disable)
ENV GO_EXTRACTOR_PATH=/usr/local/bin/extractor

# Production defaults (override via env)
ENV WEB_CONCURRENCY=2

EXPOSE 8000

CMD ["gunicorn", "app.main:app", "-c", "gunicorn_conf.py"]
