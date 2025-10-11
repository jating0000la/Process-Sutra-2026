# ProcessSutra Production Dockerfile for Google Cloud Platform
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build client
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 processsutra

# Copy built application
COPY --from=builder --chown=processsutra:nodejs /app/dist ./dist
COPY --from=builder --chown=processsutra:nodejs /app/server ./server
COPY --from=builder --chown=processsutra:nodejs /app/shared ./shared
COPY --from=builder --chown=processsutra:nodejs /app/package*.json ./
COPY --from=deps --chown=processsutra:nodejs /app/node_modules ./node_modules

# Copy migrations and scripts
COPY --from=builder --chown=processsutra:nodejs /app/migrations ./migrations
COPY --from=builder --chown=processsutra:nodejs /app/scripts ./scripts

# Install additional tools for production
RUN apk add --no-cache \
    postgresql-client \
    curl \
    && rm -rf /var/cache/apk/*

# Switch to non-root user
USER processsutra

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]