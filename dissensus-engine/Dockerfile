# Stage 1: Build (compile native addons like better-sqlite3)
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --production

# Stage 2: Runtime (slim image, no build tools)
FROM node:20-slim

WORKDIR /app

# Copy compiled node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create data directory
RUN mkdir -p /app/data/debates

EXPOSE 3000

CMD ["node", "server/index.js"]
