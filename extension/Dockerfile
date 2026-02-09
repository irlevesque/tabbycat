# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (need devDependencies for webpack build)
RUN npm install && npm cache clean --force

# Copy source files
COPY tsconfig.json webpack.config.js ./
COPY public/ ./public/
COPY src/ ./src/

# Build the extension
RUN npm run build

# Verify build succeeded
RUN ls -la dist/ && echo "Build completed successfully"

# Final stage - minimal image with artifacts
FROM node:20-alpine

WORKDIR /extension

# Copy built artifacts from builder
COPY --from=builder /app/dist/ /extension/dist/

# Set as entrypoint for easy extraction
CMD ["sh", "-c", "echo 'Extension artifacts ready in /extension/dist' && ls -la /extension/dist/"]
