# -------- 1. Build Stage --------
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install ALL deps (including devDependencies for TypeScript build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript -> JavaScript
RUN npm run build


# -------- 2. Production Stage --------
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy only package files again
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy compiled JS from builder
COPY --from=builder /usr/src/app/dist ./dist

# Expose port
EXPOSE 3000

# Run compiled app
CMD ["npm", "run", "start"]