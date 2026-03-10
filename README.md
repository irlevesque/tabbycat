# Tabbycat

A browser extension that synchronizes open tabs and tab groups across multiple browsers and operating systems without creating circular sync loops.

## Agentic Coding Disclaimer

This project is an experiment with agentic coding. I've never built a web extension and am using this project as a way to learn the contours of developing an extension as well as best practices for working on a greenfield project with coding agents. I hope it's (eventually) useful but note that this is a research project, first and foremost.

## Features

- **Non-circular tab sync** across Chrome and Firefox
- **Per-device management** with individual sync toggles
- **Device identification** with browser icons and last sync times
- **Tab group support** (Chrome) with emoji markers
- **Color customization** for synced devices
- **Configurable tab limits** (default: 50, max: 100)
- **One-click cleanup** for device-specific tabs
- **Equal browser support** for Chrome and Firefox
- OAuth 2.0 authentication via Google
- Configurable sync intervals (default: 30 seconds)
- Background sync service worker
- Clean, minimal React-based UI

## How It Works

### Non-Circular Sync System

The extension prevents tab explosion by tracking which tabs are synced from other devices:

**Chrome:**
- Creates tab groups with emoji suffix: `Device Name 📡`
- Only syncs tabs from native (non-synced) groups
- Synced groups are excluded from sync operations
- Moved tabs automatically return to their synced groups

**Firefox:**
- Uses metadata tracking in chrome.storage.local
- Tracks which tabs came from which device
- Excludes synced URLs from being re-synced
- Works with Firefox's limited tab group support

### Device Management

Each synced device is tracked with:
- Unique device ID (UUID)
- Display name (user can rename)
- Browser type with icon (🌐 Chrome, 🦊 Firefox, 🧭 Safari, 📘 Edge)
- Operating system
- Group color (randomly assigned, user-customizable)
- Sync enabled flag
- Registration and last sync timestamps
- Tab limit (0-100)

### User Control

From the popup, users can:
- **Enable/disable sync** per device (toggle switch)
- **Customize color** for each device (8 color options)
- **Adjust tab limit** per device (0-100)
- **Cleanup tabs** from specific devices (one-click)
- **View last sync time** with relative display
- **Open tabs** from remote devices

## Architecture

- **Frontend**: TypeScript + React for extension UI
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Authentication**: OAuth 2.0 with Google

## Project Structure

```
tabbycat/
├── extension/          # Browser extension code
│   ├── src/
│   │   ├── popup/     # Extension popup UI
│   │   ├── options/   # Settings page
│   │   ├── background/ # Background service worker
│   │   └── types/     # TypeScript types
│   ├── public/        # Static assets and manifest
│   └── package.json
├── backend/           # API server
│   ├── src/
│   │   ├── routes/    # API routes
│   │   ├── models/    # MongoDB models
│   │   └── middleware/ # Express middleware
│   └── package.json
└── shared/            # Shared types
```

## Setup Instructions

### Option 1: Docker (Recommended)

The easiest way to get started is using Docker and Docker Compose. See [docs/DOCKER.md](docs/DOCKER.md) for detailed instructions.

**Quick Start:**

```bash
# Create .env file with Google OAuth credentials
cat > .env << EOF
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/callback/google
EOF

# Start services
docker compose up -d

# Build extension
docker compose --profile build up --build extension-build

# View logs
docker compose logs -f
```

### Option 2: Manual Setup

#### Prerequisites

- Node.js 18+
- MongoDB
- Google Cloud Console project with OAuth credentials
- Docker and Docker Compose (optional, for containerized deployment)

#### 1. Clone and Install

```bash
cd tabbycat
npm install
cd extension && npm install
cd ../backend && npm install
```

### 2. Configure MongoDB

Start MongoDB:
```bash
mongod
```

Or update `MONGODB_URI` in `backend/.env` if using MongoDB Atlas.

### 3. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3000/auth/callback/google` to authorized redirect URIs
6. Copy Client ID and Client Secret

### 4. Configure Backend

Create `backend/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tabsync
JWT_SECRET=your-secret-key-change-this-in-production
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CLIENT_URL=chrome-extension://*
```

### 5. Start Backend

```bash
cd backend
npm run dev
```

The API server will run on `http://localhost:3000`

### 6. Build Extension

```bash
cd extension
npm run build
```

Or for development:

```bash
npm run dev
```

### 7. Load Extension in Browser

#### Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/dist` folder

#### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `extension/dist/manifest.json`

### 8. Authenticate

1. Click the extension icon
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Copy the token and store it (will be automated in future)

## Usage Guide

### First Sync

1. Open multiple tabs in your browser
2. Click "Sync Now" in the extension popup
3. Tabs are synced to the backend
4. Device appears in "Synced Devices" list

### Managing Devices

1. Open extension popup
2. View list of synced devices with last sync times
3. Toggle sync on/off per device
4. Click color dots to change device color
5. Adjust tab limit (0-100) per device
6. Click "Cleanup" to remove all tabs from a device

### Chrome Tab Groups

- Synced devices appear as tab groups: `Chrome on Windows 📡`
- Groups are collapsed by default
- Expand to view and open synced tabs
- Tabs moved from synced groups return automatically on next sync

### Firefox Metadata

- Synced tabs are tracked via metadata
- Works seamlessly with Firefox's tab group limitations
- All features available except visual tab groups

## API Endpoints

### Authentication
- `GET /auth/google` - Start Google OAuth flow
- `GET /auth/callback/google` - OAuth callback
- `GET /auth/verify` - Verify token

### Sync
- `POST /api/sync` - Sync tabs from device

### Devices
- `GET /api/devices` - Get all user devices (up to 100 tabs each)
- `POST /api/devices/register` - Register/update device

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Backend tests only
cd backend && pnpm test

# Extension tests only
cd extension && pnpm test

# Generate coverage report
pnpm test -- --coverage
```

**Test Coverage Status:**
- Backend: 100% (72/72 tests passing)
- Extension: Configured (tests in progress)

### Using Docker

```bash
# Start backend with hot reload
docker compose up backend

# Build extension
docker compose --profile build up --build extension-build
```

### Without Docker

Run everything:

```bash
npm run dev
```

## Production Deployment

### Using Docker

```bash
# Update credentials in docker-compose.yml
# Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env

# Start all services
docker compose up -d

# Build extension
docker compose --profile build up --build extension-build
```

See [docs/DOCKER.md](docs/DOCKER.md) for production deployment details including:
- Security checklist
- Backup and restore procedures
- Scaling and resource limits
- Zero-downtime deployments

### Without Docker

#### Backend
1. Set environment variables in `backend/.env`
2. Build TypeScript: `cd backend && npm run build`
3. Start server: `node dist/server.js`

#### Extension
1. Build: `cd extension && npm run build`
2. Package `extension/dist` folder
3. Submit to Chrome Web Store and Firefox Add-ons

## Security Notes

- Change JWT_SECRET in production
- Use environment variables for secrets
- Enable HTTPS in production
- Validate all user inputs
- Implement rate limiting

## Troubleshooting

### Tabs Keep Duplicating
- Ensure sync groups have the emoji suffix (📡)
- Check that sync is disabled for the current device
- Clear extension storage and re-authenticate

### Tabs Not Appearing
- Verify device sync is enabled
- Check tab limit setting (may be 0)
- Ensure backend server is running
- Check browser console for errors

### Firefox Issues
- Some tab group features are limited in Firefox
- Synced tabs work but without visual grouping
- All other features work normally

## License

MIT
