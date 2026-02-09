# Using Docker for Building and Testing

```bash
# 1. Create .env file
cat > .env << EOF
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/callback/google
EOF

# 2. Start backend services
docker compose up -d

# 3. Build extension
docker compose --profile build up --build extension-build

# 4. View logs
docker compose logs -f
```

## Common Commands

```bash
# Rebuild and restart backend
docker compose up -d --build backend

# Build extension only
docker compose --profile build up --build extension-build

# Execute command in backend container
docker compose exec backend sh
```

## Docker Compose Architecture

```
┌─────────────────┐
│  Docker Host    │
│                 │
│  ┌───────────┐  │
│  │ Extension │  │ (optional build profile)
│  │  Build    │  │
│  └───────────┘  │
│                 │
│  ┌───────────┐  │    ┌──────────────┐
│  │  Backend  │  │────│   MongoDB    │
│  │  (Node.js)│  │    │   Database   │
│  └───────────┘  │    └──────────────┘
│       │         │
│       │         │
└───────┼─────────┘
        │
        │ Port 3000
        │
    Browser
```
