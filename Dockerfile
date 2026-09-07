# Base stage
FROM node:22-alpine AS base
WORKDIR /app

# Install all dependencies (including dev) for build stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Prune to production-only dependencies for runtime image
FROM deps AS prod-deps
RUN npm prune --omit=dev && npm cache clean --force

# Production runtime image
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl

ENV NODE_ENV=production

# Copy only runtime artifacts
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Ensure non-root runtime user can write generated runtime files (logs, OpenAPI artifacts).
RUN chown -R node:node /app

# Run as non-root user
USER node

# Expose the application port (matching DEFAULT_PORT in app.constants.ts)
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]
