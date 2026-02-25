# Stage 1: build (runs natively to avoid esbuild crash under QEMU)
FROM --platform=$BUILDPLATFORM node:20-slim AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: run (uses TARGETPLATFORM by default; image runs on target host)
FROM node:20-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
COPY --from=builder /app/dist ./dist

EXPOSE 5173
CMD ["pnpm", "dev", "--host"]
