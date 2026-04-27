FROM node:20-slim

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./

# Install build tools for native addons (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install production dependencies
RUN npm install --production

# Copy application source
COPY . .

# Ensure debate data directory exists
RUN mkdir -p /app/data/debates

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "server/index.js"]
