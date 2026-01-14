# Build stage
FROM node:20-alpine AS builder

ARG NPM_TOKEN

WORKDIR /app

# Configure npm for private packages (@acho-inc/administration)
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev for TypeScript build)
RUN npm install

# Copy source code
COPY src ./src

# Copy docs for quickstart templates
COPY docs ./docs

# Build TypeScript
RUN npm run build

# Remove npmrc after build
RUN rm -f .npmrc

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files for production deps
COPY package*.json ./

# Configure npm for private packages (needed for production install)
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm install --omit=dev && \
    rm -f .npmrc && \
    npm cache clean --force

# Copy compiled JavaScript from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy docs directory for quickstart templates
COPY --from=builder --chown=nodejs:nodejs /app/docs ./docs

USER nodejs

# Default port (can be overridden via PORT env var)
EXPOSE 4000

ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 4000) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
