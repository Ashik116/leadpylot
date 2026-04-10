# Multi-stage build for Lead & Offers Service
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

# Install curl for health checks
RUN apk add --no-cache curl

# Install all dependencies (including dev dependencies)
RUN npm install --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 4003

# Set environment variables
ENV NODE_ENV=development
ENV PORT=4003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4003/health || exit 1

# Start the application
CMD ["npm", "run", "dev"]

# Production dependencies stage
FROM base AS prod-dependencies
RUN npm install --omit=dev

# Production build stage
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=prod-dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p logs uploads storage temp-uploads pdf/generated && \
    chown -R nodejs:nodejs logs uploads storage temp-uploads pdf

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4003/health || exit 1

# Start application
CMD ["node", "src/app.js"]
