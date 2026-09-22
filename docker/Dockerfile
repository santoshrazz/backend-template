# -------- 1. Build Stage --------
FROM node:20-alpine AS builder

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
FROM node:20-alpine

WORKDIR /usr/src/app

RUN corepack enable

# Copy only package files again
COPY package.json pnpm-lock.yaml ./

# Install ONLY production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy compiled JS from builder
COPY --from=builder /usr/src/app/dist ./dist

# Expose port
EXPOSE 3000

# Run compiled app (no pnpm needed at runtime)
CMD ["node", "dist/bin/www.js"]
