# AGENTS.md

This document provides comprehensive information for agents working on Tabbycat, including project overview, architecture, code conventions, and development workflow.

## Project Overview

Tabbycat is a browser extension that synchronizes open tabs and tab groups across multiple browsers and operating systems using a non-circular sync system. It enables users to seamlessly access their browsing sessions from different devices and browsers without creating tab explosion.

### Key Features
- **Non-circular tab sync** - Device-specific tracking prevents infinite loops
- **Per-device management** - Toggle sync, customize colors, set limits
- **Equal browser support** - Chrome (tab groups) and Firefox (metadata tracking)
- **Deterministic identification** - Device names with emoji markers (📡)
- **Tab limits** - Default 50, customizable 0-100 per device
- **Cleanup interface** - Remove tabs from specific devices
- **Full tab group support** (Chrome) - Preserves group structure, titles, and colors
- **OAuth 2.0 authentication** via Google
- **Configurable sync intervals** (default: 30 seconds)
- **Background sync service worker**
- **Clean, minimal React-based UI**

### Supported Browsers
- Chrome/Chromium (Manifest V3, full tab group support)
- Firefox (WebExtensions API, metadata-based tracking)
- Safari (planned, tab group support)
- Edge (planned, tab group support)

## Technology Stack

### Frontend (Extension)
- **TypeScript** (strict mode enabled)
- **React 18** (functional components with hooks)
- **Webpack** for bundling
- **WebExtension APIs**: chrome.tabs, chrome.tabGroups, chrome.storage, chrome.runtime
- **CSS Modules**: Plain CSS with component-scoped styles

### Backend (API Server)
- **Node.js** + **Express**
- **MongoDB** + **Mongoose** ODM
- **JWT** for authentication
- **OAuth 2.0** (Google)
- **dotenv** for environment configuration
- **cors** for CORS handling

### Build Tools
- **ts-loader** for TypeScript compilation
- **webpack** for extension bundling
- **nodemon** for backend development
- **CopyWebpackPlugin** and **HtmlWebpackPlugin** for asset management

### Testing
- **Jest** for unit and integration testing
- **ts-jest** for TypeScript support
- **mongodb-memory-server** for in-memory MongoDB testing
- **supertest** for API testing
- **@testing-library/react** for React component testing
- **@testing-library/jest-dom** for DOM assertions
- **JSDOM** for browser environment simulation
- **pnpm** for package management

### Test Coverage Goals
- Backend: 80% code coverage
- Extension: 70% code coverage

### Testing Strategy
- **Backend**: Unit tests for models, integration tests for routes and middleware
- **Extension**: Component tests for React UI, mocked Chrome API for browser-specific code
- **CI/CD**: Automated testing via GitHub Actions on every push and PR

## Architecture

### High-Level Architecture

The project consists of two main components:

1. **Browser Extension**: Runs in Chrome/Firefox, manages tabs and communicates with backend
2. **Backend API**: RESTful API server that stores synced data and handles authentication

### Non-Circular Sync System

The extension prevents circular sync loops through browser-specific mechanisms:

**Chrome (Tab Groups):**
- Synced tabs are placed in tab groups with emoji suffix (📡)
- Groups are excluded from sync operations
- Format: `Device Name 📡`
- Tabs moved from synced groups return automatically on next sync

**Firefox (Metadata Tracking):**
- Synced tabs are tracked in chrome.storage.local
- Metadata includes: tabId, sourceDeviceId, url, syncedAt
- Synced URLs are excluded from being re-synced
- Works with Firefox's limited tab group support

### Data Flow

1. Background service worker identifies native tabs (excludes synced groups/tabs)
2. Sync data is sent to backend API with JWT authentication
3. Backend stores data in MongoDB and returns other devices' tabs
4. Extension applies remote tabs to device-specific locations
5. Sync runs automatically every 30 seconds (configurable)
6. Users can toggle sync per device
7. Moved tabs return to synced groups (Chrome) or stay synced (Firefox)

### Directory Structure

```
tabbycat/
├── backend/                    # Backend API server
│   ├── src/
│   │   ├── middleware/         # Express middleware
│   │   │   └── auth.ts         # JWT authentication middleware
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── User.ts         # User model
│   │   │   ├── Device.ts       # Device model
│   │   │   ├── Tab.ts          # Tab model
│   │   │   └── TabGroup.ts     # TabGroup model
│   │   ├── routes/             # API route handlers
│   │   │   ├── auth.ts         # Authentication routes
│   │   │   ├── sync.ts         # Tab sync routes
│   │   │   └── devices.ts      # Device management routes
│   │   └── server.ts           # Express app setup
│   ├── .env.example            # Environment variables template
│   ├── package.json
│   └── tsconfig.json
├── extension/                  # Browser extension
│   ├── src/
│   │   ├── background/         # Background service worker
│   │   │   └── index.ts        # Sync logic and message handling
│   │   ├── popup/              # Extension popup UI
│   │   │   ├── index.tsx       # React popup component
│   │   │   ├── popup.css       # Popup styles
│   │   │   └── popup.html     # Popup HTML template
│   │   ├── options/            # Settings page
│   │   │   ├── index.tsx       # React options component
│   │   │   ├── options.css     # Options styles
│   │   │   └── options.html    # Options HTML template
│   │   └── types/              # TypeScript type definitions
│   │       └── index.ts        # Shared types
│   ├── public/                 # Static assets
│   │   └── manifest.json       # Extension manifest (v3)
│   ├── webpack.config.js       # Webpack configuration
│   ├── package.json
│   └── tsconfig.json
├── shared/                     # Shared code
│   └── types/
│       └── index.ts            # Shared TypeScript types
├── package.json                # Root package.json
├── README.md                  # User-facing documentation
├── IMPLEMENTATION.md            # Technical implementation details
└── AGENTS.md                  # This file
```

## Code Conventions

### TypeScript
- **Strict mode enabled**: All type checking errors must be resolved
- **No implicit any**: All types must be explicitly defined
- **No unused variables**: Eliminate warnings before committing
- **Async/await**: Use for all asynchronous operations
- **Error handling**: Wrap async operations in try/catch blocks

### React
- **Functional components only**: No class components
- **Hooks**: Use useState, useEffect, useCallback, useMemo as needed
- **TypeScript**: Props must be typed with interfaces
- **No comments**: Unless explicitly requested
- **Clean code**: Keep components small and focused

### General
- **No comments** in code (unless specifically requested)
- **Concise naming**: Use descriptive but brief names
- **File naming**:
  - Components: PascalCase (e.g., `index.tsx`)
  - Utilities: camelCase (e.g., `authHelper.ts`)
  - Styles: kebab-case matching component (e.g., `popup.css`)
- **Imports**: Use ES6 imports/exports
- **Constants**: SCREAMING_SNAKE_CASE for configuration constants

### Error Handling
- Always include try/catch for async operations
- Log errors to console with context
- Return meaningful error responses from API
- Graceful degradation when APIs are unavailable

## Key Files and Responsibilities

### Extension Core Files

#### `extension/src/background/index.ts`
**Responsibility**: Main sync logic and non-circular sync implementation
- Manages sync interval (default: 30 seconds)
- Collects native tabs (excludes synced groups/tabs)
- Sends sync data to backend API
- Receives and applies remote tabs to device-specific locations
- Handles device management (toggle sync, color change, limit, cleanup)
- Handles extension lifecycle events (install, startup)
- Responds to runtime messages (sync, logout, cleanup, toggle, color change)

**Key Functions**:
- `syncChrome()`: Collects tabs excluding synced groups, sends to backend
- `syncFirefox()`: Collects tabs excluding synced URLs, sends to backend
- `createOrUpdateSyncedGroupChrome()`: Creates/updates tab groups with emoji suffix
- `createOrUpdateSyncedTabsFirefox()`: Creates/tracks tabs with metadata
- `cleanupDeviceChrome()`: Removes device's tab group and tabs
- `cleanupDeviceFirefox()`: Removes device's tracked tabs
- `updateSyncedDevices()`: Updates device metadata from backend
- `fetchDeviceTabs()`: Gets device tabs with limit applied
- `toggleDeviceSync()`: Enables/disables sync for specific device
- `updateDeviceColor()`: Changes device group color
- `updateTabLimit()`: Updates per-device tab limit

**Constants**:
- `SYNC_INTERVAL`: 30000ms (30 seconds)
- `SYNC_GROUP_EMOJI`: '📡' (for Chrome group names)
- `DEFAULT_TAB_LIMIT`: 50
- `MAX_TAB_LIMIT`: 100
- `GROUP_COLORS`: Array of 8 colors for random assignment

#### `extension/src/popup/index.tsx`
**Responsibility**: Enhanced popup UI with device management
- Displays authentication status
- Shows list of synced devices (chronologically sorted)
- Per-device sync toggle (checkbox)
- Per-device color picker (8 colors)
- Per-device tab limit input (0-100)
- Per-device cleanup button
- Handles login/logout actions
- Opens tabs from remote devices
- Displays last sync time (relative format)

**State Management**:
- `isAuthenticated`: User auth status
- `syncedDevices`: Array of synced devices with metadata
- `deviceTabs`: Array of device tabs from backend
- `deviceSettings`: Per-device settings object
- `loading`: Loading state indicator
- `syncStatus`: Current sync status ('idle', 'syncing', 'error')

**UI Components**:
- `DeviceRow`: Device card with controls
- `ToggleSwitch`: Sync enable/disable toggle
- `ColorPicker`: Color selection dots
- `TabLimitInput`: Number input for tab limit

#### `extension/src/options/index.tsx`
**Responsibility**: Settings page for configuration
- Device name configuration
- Sync interval settings
- Auto-sync toggle
- Notification preferences
- Reset to default functionality

**Settings Stored**:
- `syncInterval`: Seconds between syncs (min: 10, default: 30)
- `autoSync`: Enable/disable auto-sync (default: true)
- `notifyOnSync`: Show sync notifications (default: true)
- `deviceName`: Device display name

#### `extension/public/manifest.json`
**Responsibility**: Extension manifest (Manifest V3)
- Defines extension permissions (tabs, tabGroups, storage, identity)
- Specifies background service worker
- Defines action/popup configuration
- Lists host permissions for API communication

### Backend Core Files

#### `backend/src/server.ts`
**Responsibility**: Express application setup
- Creates Express app
- Configures CORS
- Connects to MongoDB
- Registers route handlers
- Starts HTTP server on configured port

**Configuration**:
- Port from `PORT` env var (default: 3000)
- MongoDB URI from `MONGODB_URI` env var

#### `backend/src/routes/auth.ts`
**Responsibility**: Authentication endpoints
- Initiates Google OAuth flow
- Handles OAuth callback
- Generates and returns JWT tokens
- Verifies JWT tokens

**Endpoints**:
- `GET /auth/google`: Redirect to Google OAuth
- `GET /auth/callback/google`: OAuth callback handler
- `GET /auth/verify`: Verify JWT token validity

#### `backend/src/routes/sync.ts`
**Responsibility**: Tab synchronization endpoint
- Receives sync data from extension
- Stores tabs and tab groups in MongoDB
- Updates device last sync timestamp
- Returns other devices' tabs (up to 100 per device)

**Sync Logic**:
- Replaces existing tabs for device (delete + insert)
- Maintains tab group associations
- Returns recent tabs from other devices (limit: 100 per device)

#### `backend/src/routes/devices.ts`
**Responsibility**: Device management endpoints
- Lists user's devices with tabs
- Registers/updates device information

**Endpoints**:
- `GET /api/devices`: Get all user devices with tabs (up to 100 each)
- `POST /api/devices/register`: Register or update device

#### `backend/src/models/`
**Responsibility**: MongoDB schemas with proper indexing

- `User.ts`: User account schema (email, name, oauth credentials)
- `Device.ts`: Device metadata (deviceId, name, browser, os, lastSync)
- `Tab.ts`: Tab data (url, title, groupId, windowId, index, etc.)
- `TabGroup.ts`: Tab group data (title, color, collapsed, tabs array)

**Indexes**:
- Composite index on `(userId, deviceId, tabId)` - unique
- Composite index on `(userId, deviceId, groupId)` - unique

#### `backend/src/middleware/auth.ts`
**Responsibility**: JWT authentication middleware
- Verifies JWT token from Authorization header
- Extracts userId from token
- Fetches user from database
- Attaches userId to request object
- Returns 401 if invalid token

## API Reference

### Authentication Endpoints

#### `GET /auth/google`
Initiates Google OAuth flow.

**Response**: Redirects to Google OAuth page

---

#### `GET /auth/callback/google?code=<code>`
OAuth callback handler.

**Query Parameters**:
- `code` (string, required): Authorization code from Google

**Response**: HTML page with JWT token or error

---

#### `GET /auth/verify`
Verifies JWT token validity.

**Headers**:
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "valid": true,
  "user": {
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### Sync Endpoints

#### `POST /api/sync`
Syncs tabs from device to server and returns other devices' tabs.

**Headers**:
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body**:
```json
{
  "deviceId": "uuid-v4",
  "tabs": [
    {
      "id": "tab-id",
      "url": "https://example.com",
      "title": "Example",
      "faviconUrl": "https://example.com/favicon.ico",
      "active": false,
      "windowId": "window-id",
      "index": 0,
      "groupId": "group-id",
      "pinned": false,
      "lastAccessed": 1234567890
    }
  ],
  "tabGroups": [
    {
      "id": "group-id",
      "title": "Work",
      "color": "blue",
      "collapsed": false,
      "windowId": "window-id",
      "tabs": ["tab-id-1", "tab-id-2"]
    }
  ],
  "timestamp": 1234567890
}
```

**Response**:
```json
{
  "success": true,
  "deviceTabs": {
    "device-uuid-1": {
      "deviceName": "Chrome on Windows",
      "tabs": [
        {
          "url": "https://example.com",
          "title": "Example"
        }
      ],
      "lastSync": 1234567890
    }
  }
}
```

### Device Endpoints

#### `GET /api/devices`
Lists all devices for authenticated user with their recent tabs (up to 100 each).

**Headers**:
- `Authorization: Bearer <token>` (required)

**Response**:
```json
[
  {
    "deviceId": "device-uuid",
    "deviceName": "Chrome on Windows",
    "browser": "chrome",
    "os": "Windows",
    "lastSync": 1234567890,
    "tabs": [
      {
        "url": "https://example.com",
        "title": "Example"
      }
    ]
  }
]
```

---

#### `POST /api/devices/register`
Registers or updates device information.

**Headers**:
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body**:
```json
{
  "deviceId": "device-uuid",
  "name": "Chrome on Windows",
  "browser": "chrome",
  "os": "Windows"
}
```

**Response**:
```json
{
  "success": true,
  "device": {
    "_id": "mongo-id",
    "userId": "user-id",
    "deviceId": "device-uuid",
    "name": "Chrome on Windows",
    "browser": "chrome",
    "os": "Windows",
    "lastSync": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Development Workflow

### Environment Setup

1. **Clone and install dependencies**:
   ```bash
   cd tab-sync-extension
   npm install
   cd extension && npm install
   cd ../backend && npm install
   ```

2. **Configure environment**:
   - Copy `backend/.env.example` to `backend/.env`
   - Set environment variables:
     - `PORT`: Backend port (default: 3000)
     - `MONGODB_URI`: MongoDB connection string
     - `JWT_SECRET`: Secret key for JWT tokens
     - `GOOGLE_CLIENT_ID`: Google OAuth client ID
     - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

3. **Setup Google OAuth**:
   - See `GOOGLE_OAUTH_SETUP.md` for detailed instructions
   - Add redirect URI: `http://localhost:3000/auth/callback/google`

### Available Scripts

From root directory:
- `npm run dev`: Start both extension dev server and backend
- `npm run dev:extension`: Watch and build extension
- `npm run dev:backend`: Watch and restart backend with nodemon
- `npm run build:extension`: Production build of extension
- `npm run build:backend`: Compile backend TypeScript
- `npm run lint`: Run ESLint
- `npm run typecheck`: TypeScript type checking

From `extension/` directory:
- `npm run build`: Production webpack build
- `npm run dev`: Development webpack build with watch

From `backend/` directory:
- `npm run build`: Compile TypeScript to dist/
- `npm run dev`: Run server with nodemon (watch mode)
- `npm start`: Run compiled server from dist/

### Loading Extension

#### Chrome/Chromium:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle (top right)
3. Click "Load unpacked"
4. Navigate to `extension/dist` folder
5. Click "Select Folder"

#### Firefox:
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Navigate to `extension/dist/manifest.json`
4. Click "Open"

### Testing Sync Flow

1. **Start backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Build extension**:
   ```bash
   cd extension
   npm run build
   ```

3. **Load extension in browser** (see above)

4. **Authenticate**:
   - Click extension icon
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Extension receives and stores JWT token

5. **Test sync**:
   - Open multiple tabs in browser
   - Click "Sync Now" in popup
   - Verify tabs are synced to backend
   - Check device appears in "Synced Devices"

6. **Test non-circular sync**:
   - Sync tabs from device A
   - Load extension on device B
   - Authenticate and sync
   - Verify tabs appear with emoji suffix (Chrome) or metadata (Firefox)
   - Sync again - verify no duplicates created
   - Move a synced tab - verify it returns on next sync

7. **Test device management**:
   - Toggle sync on/off for a device
   - Change device color
   - Adjust tab limit
   - Cleanup device tabs

## Type Definitions

### Shared Types (`shared/types/index.ts`)

```typescript
export interface Tab {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
  active: boolean;
  windowId: string;
  index: number;
  groupId?: string;
  pinned: boolean;
  lastAccessed: number;
}

export interface TabGroup {
  id: string;
  title: string;
  color: string;
  collapsed: boolean;
  windowId: string;
  tabs: string[];
}

export interface Device {
  id: string;
  name: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  os: string;
  lastSync: number;
}

export interface SyncData {
  userId: string;
  deviceId: string;
  tabs: Tab[];
  tabGroups: TabGroup[];
  timestamp: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  oauthProvider: string;
  oauthId: string;
  createdAt: number;
}

export interface SyncedDeviceMetadata {
  deviceId: string;
  deviceName: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  os: string;
  groupColor: string;
  syncEnabled: boolean;
  registeredAt: number;
  lastSync: number;
}

export interface SyncedTabInfo {
  tabId: string;
  sourceDeviceId: string;
  url: string;
  syncedAt: number;
}

export interface DeviceSettings {
  deviceId: string;
  tabLimit: number;
  syncToMainWindows: boolean;
}
```

### Backend Models

**User Model** (`backend/src/models/User.ts`):
- `email`: Unique email address
- `name`: Display name (optional)
- `oauthProvider`: OAuth provider (e.g., "google")
- `oauthId`: Provider-specific user ID
- `createdAt`: Account creation timestamp

**Device Model** (`backend/src/models/Device.ts`):
- `userId`: Reference to User
- `deviceId`: Unique device identifier (UUID)
- `name`: Device display name
- `browser`: Browser type (chrome, firefox, safari, edge)
- `os`: Operating system name
- `lastSync`: Last sync timestamp
- `createdAt`: Device registration timestamp

**Tab Model** (`backend/src/models/Tab.ts`):
- `userId`: Reference to User
- `deviceId`: Device identifier
- `tabId`: Tab-specific ID
- `url`: Tab URL
- `title`: Tab title
- `faviconUrl`: Favicon URL (optional)
- `active`: Whether tab is currently active
- `windowId`: Window identifier
- `index`: Tab position index
- `groupId`: Tab group ID (optional)
- `pinned`: Whether tab is pinned
- `lastAccessed`: Last access timestamp
- `timestamp`: Sync timestamp

**TabGroup Model** (`backend/src/models/TabGroup.ts`):
- `userId`: Reference to User
- `deviceId`: Device identifier
- `groupId`: Group-specific ID
- `title`: Group title
- `color`: Group color
- `collapsed`: Whether group is collapsed
- `windowId`: Window identifier
- `tabs`: Array of tab IDs in group
- `timestamp`: Sync timestamp

## Important Constraints

### Security Requirements

1. **JWT Secret**: Must be changed from default in production
2. **Environment Variables**: Never commit `.env` file or secrets
3. **HTTPS Required**: OAuth requires HTTPS in production (localhost OK for dev)
4. **Token Validation**: All API routes (except auth) require valid JWT
5. **Input Validation**: Validate all user inputs on backend

### Browser API Limitations

1. **Manifest V3**: Extension uses Manifest V3 (background service worker)
2. **Chrome APIs**: Uses chrome.tabs, chrome.tabGroups, chrome.storage, chrome.runtime
3. **Firefox Compatibility**: Same APIs work in Firefox (WebExtensions standard)
4. **Tab Groups**: Full support in Chrome, limited in Firefox
5. **Permissions**: Tabs, tabGroups, storage, identity permissions required
6. **Host Permissions**: `http://localhost:3000/*` for API communication

### MongoDB Constraints

1. **Connection**: Connection string via `MONGODB_URI` environment variable
2. **Indexes**: Composite indexes enforce uniqueness for (userId, deviceId, tabId)
3. **Data Persistence**: All sync data stored in MongoDB
4. **Performance**: Limit tabs returned per device (100 per device)

### Browser-Specific Behavior

1. **Tab Groups**: Full support in Chrome, limited in Firefox
2. **Favicon URLs**: May not be available in all browsers
3. **Tab IDs**: Generated by browser, may change on browser restart
4. **Window IDs**: Generated by browser, may change on window close/open
5. **Sync Markers**: Chrome uses emoji suffix (📡), Firefox uses metadata

## Expected Behaviors

### Sync Behavior

1. **Automatic Sync**: Runs every 30 seconds (configurable via settings)
2. **Manual Sync**: User can trigger via "Sync Now" button
3. **Non-Circular**: Synced tabs never re-synced
4. **Tab Creation**: Only creates tabs from remote devices, never from current
5. **Deduplication**: Checks for existing tabs with same URL before creating
6. **Group Preservation**: Maintains tab group structure (Chrome)
7. **Return to Groups**: Tabs moved from synced groups return on next sync
8. **Per-Device Limits**: Respects device-specific tab limits (0-100)
9. **Sync Toggle**: Respects per-device sync enable/disable settings
10. **Error Handling**: Silent failures with console logging (no user disruption)

### User Experience

1. **Popup UI**:
   - Width: 400px (fixed)
   - Shows authentication status
   - Lists synced devices chronologically (most recent first)
   - Displays last sync time (relative: Just now, 5m ago, 2h ago, etc.)
   - Browser icons (🌐 Chrome, 🦊 Firefox, 🧭 Safari, 📘 Edge)
   - Per-device sync toggle
   - Per-device color picker (8 colors)
   - Per-device tab limit (0-100)
   - Displays up to 5 tabs per device
   - Shows "+N more tabs" if more than 5
   - Cleanup button per device

2. **Settings Page**:
   - Device name configuration
   - Sync interval (minimum: 10 seconds)
   - Auto-sync toggle
   - Notification preferences
   - Reset to default option

3. **Authentication**:
   - Google OAuth flow
   - Token stored in chrome.storage.local
   - Persists across sessions
   - Manual logout option

4. **Chrome Tab Groups**:
   - Synced devices appear as: `Device Name 📡`
   - Groups collapsed by default
   - Expand to view and open tabs
   - Moved tabs return automatically on next sync

5. **Firefox Metadata**:
   - Synced tabs work seamlessly
   - All features except visual tab groups
   - Metadata tracking in chrome.storage.local

### Error Handling

1. **API Errors**: Logged to console, silent user experience
2. **Auth Errors**: User notified, prompted to re-authenticate
3. **Sync Failures**: Retry on next interval, no user disruption
4. **Network Issues**: Graceful degradation, offline support
5. **Validation Errors**: Return 400 with error message

### Performance Considerations

1. **Sync Interval**: Default 30 seconds (configurable)
2. **Tab Limits**: Default 50 tabs per device, max 100
3. **Optimization**: Debounce sync calls to avoid rate limiting
4. **Storage**: Device metadata and tab info in chrome.storage.local
5. **Efficiency**: Only syncs native tabs (excludes synced)

## Development Notes

### Known Limitations

1. **Manual Token Transfer**: Currently requires manual copy-paste of auth token (future: automated)
2. **Firefox Tab Groups**: Limited support compared to Chrome
3. **Background Sync**: Requires browser to be running
4. **Real-time Updates**: No push notifications (polling-based)
5. **Device Renaming**: Can cause visual confusion, but doesn't break sync logic

### Future Enhancements

1. WebSocket support for real-time sync
2. Automated token transfer via chrome.runtime messages
3. Tab filtering and search
4. Sync history and conflict resolution
5. Multiple browser sessions per device
6. Tab statistics and analytics
7. Safari and Edge full support

### Testing Recommendations

1. Test on Chrome and Firefox
2. Test with multiple devices simultaneously
3. Test with many tabs (100+)
4. Test tab group sync (Chrome)
5. Test metadata tracking (Firefox)
6. Test offline/online transitions
7. Test authentication flow
8. Test error scenarios (API down, network issues)
9. Test non-circular sync (sync, move tab, sync again)
10. Test device management (toggle, color, limit, cleanup)

### Test Files

#### Backend Tests (`backend/tests/`)
- **setup.ts**: MongoDB memory server, test utilities, token creation
- **routes/auth.test.ts**: OAuth flow, token management, verify endpoints
- **routes/sync.test.ts**: Tab sync endpoint, device tabs retrieval
- **routes/devices.test.ts**: Device registration, device listing
- **middleware/auth.test.ts**: JWT validation, protected routes
- **models/User.test.ts**: User model validation, indexes
- **models/Device.test.ts**: Device model validation, indexes
- **models/Tab.test.ts**: Tab model validation, composite indexes
- **models/TabGroup.test.ts**: TabGroup model validation, indexes

#### Extension Tests (`extension/tests/`)
- **setup.ts**: Chrome API mocks, JSDOM environment setup
- **popup.test.tsx**: Popup component UI tests, device management
- **options.test.tsx**: Settings page tests, configuration updates

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

# Watch mode
pnpm test -- --watch
```

## Documentation Maintenance

### When to Update Documentation

Update this file (`AGENTS.md`) when:

1. **Architecture Changes**: Any changes to sync logic, data flow, or system design
2. **New Features**: Addition of new capabilities or user-facing features
3. **API Changes**: New endpoints, modified request/response formats
4. **Type Changes**: Modified or new TypeScript interfaces
5. **Configuration Changes**: New environment variables, settings, or constants
6. **Behavior Changes**: Modified expected behavior, error handling, or user experience

### Documentation Update Process

When making changes:

1. **Update AGENTS.md** first - This is the comprehensive technical reference
2. **Update README.md** - This is the user-facing documentation
3. **Update IMPLEMENTATION.md** - Add technical implementation details if needed
4. **Review all sections** - Ensure consistency across all documentation
5. **Test instructions** - Verify setup and usage steps are accurate
6. **Add changelog** - Consider adding a CHANGELOG.md for version history

### Documentation Best Practices

1. **Keep AGENTS.md comprehensive** - This is the single source of truth for agents
2. **Keep README.md user-focused** - Explain "what" and "how to use"
3. **Include examples** - Code snippets, configuration examples, API examples
4. **Use consistent formatting** - Same heading levels, code block styles, etc.
5. **Review before committing** - Ensure changes are reflected in all relevant sections
6. **Document edge cases** - Explain behavior in unusual scenarios
7. **Include troubleshooting** - Common issues and solutions

### Documentation Files Structure

- `AGENTS.md` - This file: Technical reference for agents
- `README.md` - User-facing documentation
- `QUICKSTART.md` - Quick setup guide
- `GOOGLE_OAUTH_SETUP.md` - OAuth configuration
- `IMPLEMENTATION.md` - Technical implementation details
- `CHANGELOG.md` - Version history (if created)

## Deployment

### Backend Deployment

1. Set production environment variables
2. Build TypeScript: `cd backend && npm run build`
3. Start server: `node dist/server.js`
4. Use PM2 or similar for process management
5. Configure HTTPS for production OAuth

### Extension Deployment

1. Build for production: `cd extension && npm run build`
2. Package `extension/dist` folder
3. Submit to Chrome Web Store (review required)
4. Submit to Firefox Add-ons (review required)
5. Update version numbers for releases

### Production Checklist

- [ ] Change JWT_SECRET to secure random string
- [ ] Use HTTPS for OAuth redirect URIs
- [ ] Update MONGODB_URI to production database
- [ ] Enable HTTPS on backend server
- [ ] Implement rate limiting on API
- [ ] Add logging/monitoring
- [ ] Set up backups for MongoDB
- [ ] Review and test security measures
- [ ] Update OAuth redirect URIs for production domain
- [ ] Test non-circular sync in production
- [ ] Test device management features
- [ ] Verify tab limits are enforced
- [ ] Test cleanup functionality

## Additional Resources

- [Chrome Extension Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Firefox WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

**IMPORTANT**: This document must be kept up-to-date as the project evolves. When making significant changes to architecture, APIs, or workflows, update this file following the documentation maintenance guidelines above.
