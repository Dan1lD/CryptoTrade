# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files from frontend directory
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy configuration files from frontend directory
COPY frontend/vite.config.ts frontend/tsconfig.json frontend/tailwind.config.ts frontend/components.json frontend/postcss.config.js frontend/drizzle.config.ts ./

# Copy frontend source code
COPY frontend/src ./src
COPY frontend/server ./server
COPY frontend/public ./public
COPY frontend/index.html ./

# Build production bundle (only build the frontend, not the server)
# Set NODE_ENV=production to exclude Replit dev plugins
ENV NODE_ENV=production
RUN npx vite build

# Verify build output (helpful for debugging)
RUN echo "=== Build output verification ===" && \
    echo "Contents of /app:" && ls -la /app && \
    echo "Contents of /app/dist:" && ls -la /app/dist/ && \
    echo "CSS files:" && find /app/dist -name "*.css" && \
    echo "JS files:" && find /app/dist -name "*.js" | head -3 && \
    echo "=== Build completed successfully ==="

# Production stage  
FROM nginx:1.25-alpine

# Install curl for health checks (Windows Docker Desktop compatible)
RUN apk add --no-cache curl

# Remove default nginx files to avoid conflicts
RUN rm -rf /usr/share/nginx/html/* && \
    rm -f /etc/nginx/conf.d/default.conf

# Copy built assets from build stage (vite outputs to /app/dist)
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Verify files were copied correctly
RUN echo "=== Nginx setup verification ===" && \
    echo "Files in /usr/share/nginx/html:" && \
    ls -la /usr/share/nginx/html && \
    echo "Nginx config:" && \
    cat /etc/nginx/conf.d/default.conf && \
    echo "=== Nginx setup complete ==="

# Expose port
EXPOSE 80

# Health check using curl (more reliable cross-platform than wget)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
