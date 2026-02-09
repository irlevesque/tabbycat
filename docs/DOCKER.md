# Docker Setup for Tabbycat

This document provides comprehensive information for running Tabbycat using Docker and Docker Compose.

## Overview

Tabbycat Docker setup includes:
- **Backend API** - Node.js/Express server with TypeScript compilation
- **MongoDB** - Database for storing synced data
- **Extension Build** - Containerized environment for building the browser extension

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Google OAuth credentials (see [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md))

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/callback/google
```

**Important**: Update these values with your actual Google OAuth credentials. For production, you should also change the MongoDB credentials and JWT secret in `docker-compose.yml`.

### 2. Start Services

Start MongoDB and the backend API:

```bash
docker compose up -d
```

This will:
- Start MongoDB on port 27017
- Build and start the backend API on port 3000
- Create a Docker network for service communication

### 3. Build the Extension

Build the extension in a Docker container:

```bash
docker compose --profile build up --build extension-build
```

The built extension files will be available in `extension/dist/`.

### 4. View Logs

View logs for all services:

```bash
docker compose logs -f
```

View logs for a specific service:

```bash
docker compose logs -f backend
docker compose logs -f mongodb
```

### 5. Stop Services

Stop all running services:

```bash
docker compose down
```

Stop services and remove volumes:

```bash
docker compose down -v
```

## Docker Compose Services

### MongoDB

```yaml
mongodb:
  image: mongo:7
  ports: ["27017:27017"]
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: password
  volumes:
    - mongodb_data:/data/db
```

**Default Credentials**:
- Username: `admin`
- Password: `password`
- Database: `tabbycat`

**Production**: Change these credentials in `docker-compose.yml` before deploying.

### Backend API

```yaml
backend:
  build: ./backend
  ports: ["3000:3000"]
  environment:
    NODE_ENV: production
    PORT: 3000
    MONGODB_URI: mongodb://admin:password@mongodb:27017/tabbycat?authSource=admin
    JWT_SECRET: your-jwt-secret-change-this-in-production
    GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
  depends_on: [mongodb]
```

**Environment Variables**:
- `NODE_ENV`: Environment (development/production)
- `PORT`: API server port (default: 3000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_CALLBACK_URL`: OAuth callback URL

### Extension Build

```yaml
extension-build:
  build: ./extension
  profiles: [build]
  volumes:
    - ./extension/dist:/app/dist
```

This service is only started when using the `build` profile. It builds the extension and makes the `dist` directory available on the host.

## Individual Dockerfiles

### Backend Dockerfile

Located at `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Multi-stage build**:
- Stage 1: Compiles TypeScript to JavaScript
- Stage 2: Runtime image with only production dependencies

### Extension Dockerfile

Located at `extension/Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY webpack.config.js ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build
WORKDIR /app/dist
CMD ["sh", "-c", "echo 'Extension built successfully in /app/dist' && sleep infinity"]
```

This Dockerfile builds the extension using Webpack and keeps the container running so the built files can be extracted.

## Development Workflow

### Backend Development

For active development with hot reload, use Docker Compose with mounted volumes:

```bash
docker compose up backend
```

Changes to `backend/src/` will trigger a rebuild on the next request.

### Extension Development

For extension development, it's recommended to build locally:

```bash
cd extension
npm run dev
```

Or use Docker for one-time builds:

```bash
docker compose --profile build up --build extension-build
```

### Production Build

Build production images:

```bash
docker compose build --no-cache
```

## Loading the Extension

After building the extension:

1. **Chrome/Chromium**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `extension/dist` folder

2. **Firefox**:
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Navigate to `extension/dist/manifest.json`

## Docker Commands Reference

### Service Management

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d backend

# Stop all services
docker compose down

# Restart service
docker compose restart backend

# Rebuild and restart
docker compose up -d --build backend
```

### Build Images

```bash
# Build all images
docker compose build --no-cache

# Build specific service
docker compose build --no-cache backend
```

### Logs

```bash
# View all logs
docker compose logs

# Follow logs
docker compose logs -f

# View service logs
docker compose logs -f backend

# View last 100 lines
docker compose logs --tail=100 backend
```

### Exec Commands

```bash
# Execute command in backend container
docker compose exec backend sh

# View files in container
docker compose exec backend ls -la /app

# Check environment variables
docker compose exec backend env
```

### Volume Management

```bash
# List volumes
docker volume ls

# Remove unused volumes
docker volume prune

# Inspect volume
docker volume inspect tabbycat_mongodb_data
```

### Network Management

```bash
# List networks
docker network ls

# Inspect network
docker network inspect tabbycat_tabbycat-network
```

## Troubleshooting

### Backend fails to start

Check if MongoDB is running:

```bash
docker compose ps
docker compose logs mongodb
```

Verify MongoDB connection string in `docker-compose.yml`.

### Extension build fails

Check extension Docker logs:

```bash
docker compose logs extension-build
```

Ensure all files are copied correctly in the Dockerfile.

### Permission issues with volumes

On Linux, you may need to adjust volume permissions:

```bash
sudo chown -R $USER:$USER ./backend
sudo chown -R $USER:$USER ./extension/dist
```

### MongoDB connection issues

Verify MongoDB is accepting connections:

```bash
docker compose exec mongodb mongosh -u admin -p password --authenticationDatabase admin
```

### Port already in use

If port 3000 or 27017 is already in use, change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Use 3001 instead of 3000
```

## Production Deployment

### Security Checklist

Before deploying to production:

- [ ] Change MongoDB credentials in `docker-compose.yml`
- [ ] Change JWT_SECRET to a strong random string
- [ ] Update GOOGLE_CALLBACK_URL to production domain
- [ ] Use HTTPS for OAuth callback URL
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable MongoDB authentication
- [ ] Review and restrict API access

### Environment Variables

Create a production `.env` file:

```bash
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/callback/google
```

Update `docker-compose.yml`:

```yaml
environment:
  NODE_ENV: production
  MONGODB_URI: mongodb://production-user:strong-password@mongodb:27017/tabbycat?authSource=admin
  JWT_SECRET: <generate-strong-random-string>
```

### Running in Production

```bash
docker compose up -d
```

### Scaling Backend

To run multiple backend instances (requires load balancer):

```bash
docker compose up -d --scale backend=3
```

### Resource Limits

Add resource constraints to `docker-compose.yml`:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

## Backup and Restore

### Backup MongoDB

```bash
docker compose exec mongodb mongodump -u admin -p password --authenticationDatabase admin --db tabbycat -o /backup
docker cp tabbycat-mongodb:/backup ./backup
```

### Restore MongoDB

```bash
docker cp ./backup tabbycat-mongodb:/backup
docker compose exec mongodb mongorestore -u admin -p password --authenticationDatabase admin --db tabbycat /backup/tabbycat
```

## Updating the Application

### Pull latest code

```bash
git pull origin main
```

### Rebuild and restart

```bash
docker compose up -d --build --no-cache
```

### Zero-downtime deployment

For zero-downtime updates:

1. Build new image:
   ```bash
   docker compose build --no-cache backend
   ```

2. Stop old container:
   ```bash
   docker compose stop backend
   ```

3. Start new container:
   ```bash
   docker compose up -d backend
   ```

## Performance Optimization

### Build optimization

- Use Docker layer caching by copying `package.json` first
- Use multi-stage builds to reduce image size
- Minimize the number of layers in Dockerfiles

### Runtime optimization

- Use Alpine Linux images for smaller size
- Remove development dependencies in production
- Use `.dockerignore` to exclude unnecessary files

### Database optimization

- Configure MongoDB memory limits
- Use MongoDB indexes (already configured in models)
- Regular database maintenance

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/README.md)

## Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review logs: `docker compose logs`
3. Check service status: `docker compose ps`
4. Open an issue on GitHub
