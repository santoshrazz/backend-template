# -------- 1. Build Stage --------
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Enable pnpm via corepack (version pinned by package.json's "packageManager")
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL deps (including devDependencies for TypeScript build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript -> JavaScript
RUN pnpm run build


# -------- 2. Production Stage --------
FROM node:22-alpine

WORKDIR /usr/src/app

RUN corepack enable

# Copy only package files again
COPY package.json pnpm-lock.yaml ./

# Install ONLY production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy compiled JS from builder
COPY --from=builder /usr/src/app/dist ./dist

# Drop root: the app only needs read access to /usr/src/app
USER node

# Expose port
EXPOSE 3000

# Liveness probe (/health is outside the rate limiter)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3   CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run compiled app (no pnpm needed at runtime)
CMD ["node", "dist/bin/www.js"]
