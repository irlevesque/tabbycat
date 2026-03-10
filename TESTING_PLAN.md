# Tabbycat Testing Plan

## 1. Testing Setup

### 1.1 Backend Testing Dependencies

```bash
cd backend

# Install testing dependencies
npm install --save-dev jest ts-jest @types/jest @types/node mongodb-memory-server supertest

# Update package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.4.5",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.1",
    "mongodb-memory-server": "^9.0.0",
    "supertest": "^6.3.0"
  }
}
```

### 1.2 Extension Testing Dependencies

```bash
cd extension

# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom

# Update package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ui": "jest --testPathPattern=ui"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.5.0",
    "jest-environment-jsdom": "^29.5.0"
  }
}
```

### 1.3 Testing Utilities and Helpers

#### Backend Test Utilities (`backend/tests/utils/`)

```typescript
// backend/tests/utils/mockData.ts
export const mockUser = {
  email: 'test@example.com',
  name: 'Test User',
  oauthProvider: 'google',
  oauthId: '123456789',
  createdAt: new Date()
};

export const mockDevice = {
  userId: 'user123',
  deviceId: 'device123',
  name: 'Test Device',
  browser: 'chrome' as const,
  os: 'Windows',
  lastSync: new Date(),
  createdAt: new Date()
};

export const mockTab = {
  userId: 'user123',
  deviceId: 'device123',
  tabId: 'tab123',
  url: 'https://example.com',
  title: 'Example',
  faviconUrl: 'https://example.com/favicon.ico',
  active: false,
  windowId: 'window123',
  index: 0,
  groupId: 'group123',
  pinned: false,
  lastAccessed: new Date(),
  timestamp: new Date()
};

export const mockTabGroup = {
  userId: 'user123',
  deviceId: 'device123',
  groupId: 'group123',
  title: 'Work',
  color: 'blue',
  collapsed: false,
  windowId: 'window123',
  tabs: ['tab123'],
  timestamp: new Date()
};
```

#### Extension Test Utilities (`extension/tests/utils/`)

```typescript
// extension/tests/utils/mockData.ts
export const mockSyncData = {
  deviceId: 'device123',
  tabs: [{
    id: 'tab123',
    url: 'https://example.com',
    title: 'Example',
    faviconUrl: 'https://example.com/favicon.ico',
    active: false,
    windowId: 'window123',
    index: 0,
    groupId: 'group123',
    pinned: false,
    lastAccessed: Date.now()
  }],
  tabGroups: [{
    id: 'group123',
    title: 'Work',
    color: 'blue',
    collapsed: false,
    windowId: 'window123',
    tabs: ['tab123']
  }],
  timestamp: Date.now()
};
```

## 2. Backend API Testing Structure

### 2.1 Authentication Routes Tests (`backend/tests/routes/auth.test.ts`)

#### Test Cases:

1. **GET /auth/google**
   - ✓ Should redirect to Google OAuth with correct parameters
   - ✓ Should include extensionId in state parameter
   - ✓ Should handle missing extensionId gracefully
   - ✓ Should generate correct OAuth URL

2. **GET /auth/callback/google**
   - ✓ Should handle valid OAuth code and return user
   - ✓ Should create new user if not exists
   - ✓ Should update existing user if OAuthId matches
   - ✓ Should generate valid JWT token
   - ✓ Should store token for polling
   - ✓ Should return HTML with token display
   - ✓ Should attempt automatic token delivery to extension
   - ✓ Should show fallback on manual token copy
   - Should return 400 error for missing code
   - Should return 500 error for OAuth failure

3. **GET /auth/poll**
   - ✓ Should return token by tokenId
   - ✓ Should return token by extensionId as fallback
   - ✓ Should return 404 for expired tokens
   - ✓ Should remove token after successful retrieval
   - ✓ Should return 404 for non-existent tokens

4. **GET /auth/verify**
   - ✓ Should return valid token with user info
   - Should return 401 for missing Authorization header
   - Should return 401 for invalid token format
   - Should return 401 for expired token
   - Should return 401 if user not found

### 2.2 Sync Routes Tests (`backend/tests/routes/sync.test.ts`)

#### Test Cases:

1. **POST /api/sync**
   - ✓ Should sync valid tabs and tab groups
   - ✓ Should delete existing tabs for device
   - ✓ Should delete existing tab groups for device
   - ✓ Should update device lastSync timestamp
   - ✓ Should return other devices' tabs
   - ✓ Should return 401 for missing authentication
   - ✓ Should return 400 for invalid request data
   - Should handle empty tabs array
   - Should handle missing tabGroups array
   - Should limit returned tabs to 10 per device
   - Should handle sync errors gracefully

### 2.3 Device Routes Tests (`backend/tests/routes/devices.test.ts`)

#### Test Cases:

1. **GET /api/devices**
   - ✓ Should return all devices for authenticated user
   - ✓ Should include tabs for each device (up to 100)
   - ✓ Should sort devices by lastSync descending
   - Should return 401 for missing authentication
   - Should handle empty device list

2. **POST /api/devices/register**
   - ✓ Should register new device
   - ✓ Should update existing device
   - ✓ Should return device information
   - Should return 401 for missing authentication
   - Should return 400 for missing required fields
   - Should validate browser enum values

### 2.4 Auth Middleware Tests (`backend/tests/middleware/auth.test.ts`)

#### Test Cases:

1. **authMiddleware**
   - ✓ Should attach userId to request
   - Should return 401 for missing Authorization header
   - Should return 401 for invalid Authorization format
   - Should return 401 for invalid JWT token
   - Should return 401 if user not found
   - Should pass request to next middleware on success

### 2.5 Model Tests (`backend/tests/models/`)

#### User Model Tests (`backend/tests/models/User.test.ts`)
- ✓ Should create new user with required fields
- ✓ Should reject duplicate email
- ✓ Should create user with optional name

#### Device Model Tests (`backend/tests/models/Device.test.ts`)
- ✓ Should create device with all required fields
- ✓ Should reject duplicate userId+deviceId
- ✓ Should update device metadata

#### Tab Model Tests (`backend/tests/models/Tab.test.ts`)
- ✓ Should create tab with all fields
- ✓ Should reject duplicate userId+deviceId+tabId
- ✓ Should handle optional fields (faviconUrl, groupId)

#### TabGroup Model Tests (`backend/tests/models/TabGroup.test.ts`)
- ✓ Should create tab group with all fields
- ✓ Should reject duplicate userId+deviceId+groupId
- ✓ Should handle tabs array

## 3. Extension UI Testing Structure

### 3.1 Popup Component Tests (`extension/tests/popup.test.tsx`)

#### Test Cases:

1. **Authentication Status**
   - ✓ Should show login button when not authenticated
   - ✓ Should show logout button when authenticated
   - ✓ Should display JWT token info when authenticated

2. **Device List Display**
   - ✓ Should display list of synced devices
   - ✓ Should sort devices chronologically (recent first)
   - ✓ Should display device name with emoji marker
   - ✓ Should show browser icon for each device
   - ✓ Should display last sync time (relative format)
   - ✓ Should show "+N more tabs" for devices with >5 tabs

3. **Device Controls**
   - ✓ Should toggle sync for device
   - ✓ Should open device tab when clicked
   - ✓ Should show device color indicator
   - ✓ Should show device tab limit input
   - ✓ Should show cleanup button for each device

4. **Sync Status**
   - ✓ Should show 'idle' status when no sync happening
   - ✓ Should show 'syncing' status during sync
   - ✓ Should show 'error' status on sync failure

### 3.2 Options Component Tests (`extension/tests/options.test.tsx`)

#### Test Cases:

1. **Settings Display**
   - ✓ Should show device name input
   - ✓ Should show sync interval slider
   - ✓ Should show auto-sync toggle
   - ✓ Should show notification preferences toggle

2. **Settings Persistence**
   - ✓ Should save device name changes
   - ✓ Should save sync interval changes
   - ✓ Should save auto-sync preference
   - ✓ Should save notification preference

3. **Validation**
   - ✓ Should validate device name length
   - ✓ Should validate sync interval (min: 10)
   - ✓ Should prevent invalid settings

### 3.3 Device Management UI Tests (`extension/tests/deviceManagement.test.tsx`)

#### Test Cases:

1. **Color Picker**
   - ✓ Should display 8 color options
   - ✓ Should update device color when selected
   - ✓ Should show current color selection

2. **Tab Limit**
   - ✓ Should display current tab limit
   - ✓ Should update tab limit when changed
   - ✓ Should validate tab limit (0-100)

3. **Cleanup**
   - ✓ Should remove device's tab group
   - ✓ Should remove device's tracked tabs
   - ✓ Should show confirmation dialog

### 3.4 Authentication Flow UI Tests (`extension/tests/authentication.test.tsx`)

#### Test Cases:

1. **Login Flow**
   - ✓ Should redirect to Google OAuth
   - ✓ Should handle OAuth callback
   - ✓ Should store JWT token in chrome.storage.local
   - ✓ Should display success message after auth
   - ✓ Should handle OAuth errors

2. **Token Storage**
   - ✓ Should store token in chrome.storage.local
   - ✓ Should retrieve token from storage
   - ✓ Should clear token on logout
   - ✓ Should handle storage errors

3. **Manual Token Copy**
   - ✓ Should show fallback token on manual copy
   - ✓ Should copy token to clipboard
   - ✓ Should show copy confirmation

### 3.5 Storage and State Tests (`extension/tests/storage.test.ts`)

#### Test Cases:

1. **Chrome Storage**
   - ✓ Should save JWT token
   - ✓ Should retrieve JWT token
   - ✓ Should clear storage
   - ✓ Should handle storage errors

2. **State Management**
   - ✓ Should update device list state
   - ✓ Should update sync status state
   - ✓ Should update device settings state
   - ✓ Should handle state persistence

## 4. Integration Testing Strategy

### 4.1 API Communication Tests (`backend/tests/integration/apiCommunication.test.ts`)

#### Test Cases:

1. **Extension ↔ API Communication**
   - ✓ Should send sync data to API
   - ✓ Should receive device tabs from API
   - ✓ Should handle API errors gracefully
   - Should verify data integrity in sync

2. **Authentication Flow**
   - ✓ Should complete OAuth flow
   - ✓ Should receive token via poll
   - ✓ Should handle token expiration
   - Should verify token storage

### 4.2 Sync Flow Tests (`backend/tests/integration/syncFlow.test.ts`)

#### Test Cases:

1. **Full Sync Cycle**
   - ✓ Should sync tabs from device A
   - ✓ Should sync tabs from device B
   - ✓ Should sync tabs from device C
   - ✓ Should verify no circular sync
   - ✓ Should maintain tab structure

2. **Device Management**
   - ✓ Should register new device
   - ✓ Should update device metadata
   - ✓ Should toggle device sync
   - ✓ Should remove device tabs
   - Should handle device cleanup

### 4.3 Authentication Flow Tests (`backend/tests/integration/authenticationFlow.test.ts`)

#### Test Cases:

1. **Full Authentication**
   - ✓ Should complete OAuth flow
   - ✓ Should receive and store token
   - ✓ Should verify token validity
   - ✓ Should handle logout

2. **Multi-Device Auth**
   - ✓ Should support multiple devices
   - ✓ Should maintain separate auth tokens
   - ✓ Should handle concurrent auth

### 4.4 Edge Cases Tests (`backend/tests/integration/edgeCases.test.ts`)

#### Test Cases:

1. **Error Handling**
   - ✓ Should handle API downtime
   - ✓ Should handle network failures
   - ✓ Should handle timeout errors
   - Should handle malformed data

2. **Data Validation**
   - ✓ Should handle invalid URLs
   - ✓ Should handle empty tab arrays
   - ✓ Should handle missing fields
   - Should handle special characters

## 5. Testing Priority and Implementation Order

### Phase 1: Critical Path Testing (Week 1)
1. Backend Auth Middleware
2. Backend Auth Routes
3. Backend Device Routes
4. Backend Sync Routes
5. Extension Authentication UI
6. Extension Storage Tests

### Phase 2: Core Functionality Testing (Week 2)
1. Backend Device Model
2. Backend Tab Model
3. Backend TabGroup Model
4. Extension Popup UI
5. Extension Options UI
6. Integration API Communication

### Phase 3: Advanced UI Testing (Week 3)
1. Extension Device Management UI
2. Extension Color Picker
3. Extension Tab Limit Input
4. Extension Cleanup UI

### Phase 4: Integration Testing (Week 4)
1. Full Sync Flow
2. Full Authentication Flow
3. Multi-Device Sync
4. Error Scenarios

### Phase 5: Edge Cases and Refinement (Week 5)
1. Performance Testing
2. Security Testing
3. Edge Cases
4. Browser Compatibility
5. Final Regression Testing

## 6. Implementation Steps

### Step 1: Setup Testing Infrastructure

```bash
# Backend Setup
cd backend
npm install --save-dev jest ts-jest @types/jest @types/node mongodb-memory-server supertest

# Create test directories
mkdir -p tests/routes
mkdir -p tests/middleware
mkdir -p tests/models
mkdir -p tests/integration

# Extension Setup
cd ../extension
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom

# Create test directories
mkdir -p tests/popup
mkdir -p tests/options
mkdir -p tests/deviceManagement
mkdir -p tests/authentication
mkdir -p tests/storage
```

### Step 2: Create Test Files

#### Backend Test Files

```typescript
// backend/tests/routes/auth.test.ts
import request from 'supertest';
import { app } from '../src/server';
import { User } from '../src/models/User';

describe('Auth Routes', () => {
  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app).get('/auth/google');
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('accounts.google.com');
    });

    it('should include extensionId in state parameter', async () => {
      const response = await request(app)
        .get('/auth/google?extensionId=test123');
      expect(response.headers.location).toContain('state=');
    });
  });

  describe('GET /auth/callback/google', () => {
    it('should create user and return token', async () => {
      const response = await request(app)
        .post('/auth/callback/google')
        .send({ code: 'test-code' });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Authentication Successful');
    });
  });

  describe('GET /auth/poll', () => {
    it('should return token when found', async () => {
      // Implementation
    });

    it('should return 404 when token not found', async () => {
      const response = await request(app)
        .get('/auth/poll?tokenId=nonexistent');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ found: false });
    });
  });

  describe('GET /auth/verify', () => {
    it('should return valid token', async () => {
      const token = createTestToken('user123');
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
```

#### Extension Test Files

```typescript
// extension/tests/popup.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Popup from '../src/popup';

describe('Popup Component', () => {
  describe('Authentication Status', () => {
    it('should show login button when not authenticated', () => {
      render(<Popup />);
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('should show logout button when authenticated', () => {
      render(<Popup isAuthenticated={true} />);
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
  });

  describe('Device List', () => {
    it('should display list of devices', () => {
      const devices = [
        {
          deviceId: 'device1',
          deviceName: 'Chrome on Windows 📡',
          lastSync: Date.now()
        }
      ];

      render(<Popup syncedDevices={devices} />);
      expect(screen.getByText('Chrome on Windows 📡')).toBeInTheDocument();
    });

    it('should sort devices by lastSync', () => {
      const devices = [
        { deviceId: 'device1', deviceName: 'Device 1', lastSync: Date.now() - 10000 },
        { deviceId: 'device2', deviceName: 'Device 2', lastSync: Date.now() }
      ];

      render(<Popup syncedDevices={devices} />);
      const deviceElements = screen.getAllByTestId('device-item');
      expect(deviceElements[0]).toHaveTextContent('Device 2');
      expect(deviceElements[1]).toHaveTextContent('Device 1');
    });
  });

  describe('Device Controls', () => {
    it('should toggle sync when clicked', async () => {
      render(<Popup />);

      const syncToggle = screen.getByTestId('sync-toggle');
      await waitFor(() => {
        expect(syncToggle).toBeInTheDocument();
      });
    });

    it('should open device tab when clicked', async () => {
      render(<Popup />);

      const deviceTab = screen.getByText('Chrome on Windows 📡');
      await waitFor(() => {
        fireEvent.click(deviceTab);
      });
    });
  });
});
```

### Step 3: Run Tests

```bash
# Backend Tests
cd backend

# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run specific test file
npm test -- auth.test.ts
```

```bash
# Extension Tests
cd extension

# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run UI tests only
npm run test:ui

# Run specific test file
npm test -- popup.test.tsx
```

### Step 4: CI/CD Integration

#### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Backend Dependencies
        run: |
          cd backend
          npm ci
      - name: Run Backend Tests
        run: |
          cd backend
          npm test -- --coverage --maxWorkers=2

  extension-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Extension Dependencies
        run: |
          cd extension
          npm ci
      - name: Run Extension Tests
        run: |
          cd extension
          npm test -- --coverage --maxWorkers=2

  integration-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, extension-tests]
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Dependencies
        run: |
          cd backend
          npm ci
          cd ../extension
          npm ci
      - name: Run Integration Tests
        run: |
          cd backend
          npm run test:integration
```

### Step 5: Test Coverage Goals

- **Backend**: 80%+ coverage for all routes and models
- **Extension**: 70%+ coverage for all components
- **Integration**: 90%+ coverage for critical flows
- **Critical Path**: 100% coverage

### Step 6: Test Maintenance

1. **Regular Updates**: Update tests when code changes
2. **Test Cleanup**: Remove obsolete tests
3. **Performance Monitoring**: Monitor test execution time
4. **Coverage Tracking**: Track coverage trends over time
5. **Test Documentation**: Document complex test scenarios

### Step 7: Continuous Improvement

1. **Test Strategy Review**: Quarterly review of testing approach
2. **Tool Updates**: Keep testing tools and frameworks updated
3. **Best Practices**: Follow testing best practices and patterns
4. **Performance Optimization**: Optimize slow tests
5. **Error Analysis**: Analyze test failures and improve flaky tests

## Summary

This testing plan provides a comprehensive approach to testing the Tabbycat extension and backend API. The plan follows a systematic progression from critical path testing to edge cases, ensuring that the most important functionality is thoroughly tested first. The use of Jest with TypeScript, in-memory MongoDB, and React Testing Library provides a robust testing framework that can be executed efficiently in both development and CI/CD environments.

The plan emphasizes:
- **Critical path first**: Authentication and sync endpoints
- **Component isolation**: Tests for individual components
- **Integration testing**: End-to-end workflows
- **Performance monitoring**: Test execution time and coverage
- **Continuous improvement**: Regular updates and optimization
