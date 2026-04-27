FROM node:20-slim

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./

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
