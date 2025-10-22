FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY server.js .

# Expose port
EXPOSE 7077

# Health check
HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
  CMD wget --spider -q http://localhost:7077/health || exit 1

# Start server
CMD ["node", "server.js"]
