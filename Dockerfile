FROM node:18-alpine

WORKDIR /app

# Copy root level files
COPY . .

# Install server dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Expose port
EXPOSE 3210

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3210/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server from server directory
CMD ["node", "server-firebase.js"]
