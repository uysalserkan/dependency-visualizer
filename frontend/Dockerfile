FROM node:20-slim

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy dependency files
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Expose port
EXPOSE 5173

# Run the development server (for production, use nginx to serve dist/)
CMD ["pnpm", "dev", "--host"]
