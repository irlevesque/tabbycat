# Testing Guide

This document provides a comprehensive testing strategy and roadmap for the Tab Sync Extension project.

## TODO

- [ ] Week 1 - Backend Testing Foundation
  - [ ] Install Jest and dependencies
  - [ ] Create test configuration
  - [ ] Write unit tests for models
  - [ ] Write integration tests for API endpoints

- [ ] Week 2 - Extension Testing Foundation
  - [ ] Create Chrome API mocks
  - [ ] Set up React testing library
  - [ ] Write component tests for popup
  - [ ] Write unit tests for background sync logic

- [ ] Week 3 - Critical Path Testing
  - [ ] E2E tests for authentication
  - [ ] E2E tests for sync flow
  - [ ] E2E tests for non-circular sync verification

- [ ] Week 4 - Documentation & CI/CD
  - [ ] Create TESTING.md (this file)
  - [ ] Set up GitHub Actions
  - [ ] Add coverage reporting
  - [ ] Document test procedures

## Current State

**What Exists:**
- Comprehensive documentation (AGENTS.md, README.md, IMPLEMENTATION.md, QUICKSTART.md)
- High-level testing checklist in IMPLEMENTATION.md (12 items, all marked complete)
- Testing recommendations in AGENTS.md (10 high-level points)

**What's Missing:**
- No test files or test directories
- No testing frameworks configured (Jest, Mocha, Vitest, etc.)
- No automated tests for backend or extension
- No integration or end-to-end tests
- No test fixtures or mock data
- No CI/CD testing configuration
- No detailed testing procedures document

## Testing Strategy

### Phase 1: Backend API Testing (Priority: High)

#### 1. Set up testing framework

```bash
cd backend
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest mongodb-memory-server
```

#### 2. Create test directory structure

```
backend/src/
├── __tests__/
│   ├── unit/
│   │   ├── models/
│   │   │   ├── User.test.ts
│   │   │   ├── Device.test.ts
│   │   │   ├── Tab.test.ts
│   │   │   └── TabGroup.test.ts
│   │   └── routes/
│   │       ├── auth.test.ts
│   │       ├── sync.test.ts
│   │       └── devices.test.ts
│   └── integration/
│       ├── api.test.ts
│       └── sync-flow.test.ts
└── fixtures/
    └── test-data.ts
```

#### 3. Create test configuration

**backend/jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

**backend/package.json - add scripts:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

#### 4. Write critical tests

**Unit Tests:**
- Model validation (required fields, types, constraints)
- Route handler logic
- Middleware (JWT verification)
- Utility functions

**Integration Tests:**
- API endpoints with in-memory MongoDB
- Authentication flow (OAuth simulation)
- Sync endpoint (store/retrieve tabs)
- Device management endpoints
- Error handling (400, 401, 404, 500)

**Test Examples:**

```typescript
// backend/src/__tests__/unit/models/User.test.ts
import { User } from '../../../models/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('User Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  it('should create a user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      oauthProvider: 'google',
      oauthId: 'google-oauth-id-123'
    };

    const user = new User(userData);
    await user.save();

    expect(user.email).toBe(userData.email);
    expect(user.name).toBe(userData.name);
  });

  it('should require email field', async () => {
    const user = new User({});
    await expect(user.save()).rejects.toThrow();
  });
});
```

### Phase 2: Extension Testing (Priority: High)

#### 1. Set up extension testing

```bash
cd extension
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

#### 2. Create test structure

```
extension/src/
├── __tests__/
│   ├── components/
│   │   ├── popup.test.tsx
│   │   └── options.test.tsx
│   ├── background/
│   │   ├── sync.test.ts
│   │   ├── chrome.test.ts
│   │   └── firefox.test.ts
│   └── utils/
│       └── helpers.test.ts
├── e2e/
│   ├── sync-flow.test.ts
│   ├── device-management.test.ts
│   └── authentication.test.ts
└── mocks/
    ├── chrome-api.ts
    ├── storage.ts
    └── runtime.ts
```

#### 3. Create Chrome API mocks

**extension/src/mocks/chrome-api.ts:**
```typescript
export const mockChromeTabs = {
  query: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  move: jest.fn(),
  remove: jest.fn(),
  get: jest.fn()
};

export const mockChromeTabGroups = {
  query: jest.fn(),
  update: jest.fn(),
  get: jest.fn(),
  create: jest.fn()
};

export const mockChromeStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
    remove: jest.fn()
  }
};

export const mockChromeRuntime = {
  sendMessage: jest.fn(),
  onMessage: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
};

// Mock global chrome object
global.chrome = {
  tabs: mockChromeTabs,
  tabGroups: mockChromeTabGroups,
  storage: mockChromeStorage,
  runtime: mockChromeRuntime
} as any;
```

#### 4. Write critical tests

**Component Tests:**
- Popup UI rendering
- Device list display
- Toggle switch functionality
- Color picker interaction
- Tab limit input validation
- Cleanup button action
- Authentication state display

**Background Worker Tests:**
- Sync logic (Chrome)
- Sync logic (Firefox)
- Non-circular detection
- Device management (toggle, color, limit, cleanup)
- Message handling
- Event listeners (install, startup)

**Test Examples:**

```typescript
// extension/src/__tests__/background/sync.test.ts
import { syncChrome } from '../../background/index';
import { mockChromeTabs, mockChromeTabGroups, mockChromeStorage } from '../mocks/chrome-api';

describe('Chrome Sync Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should collect native tabs excluding synced groups', async () => {
    const tabs = [
      { id: 1, url: 'https://example.com', title: 'Example', groupId: 'group-1' },
      { id: 2, url: 'https://google.com', title: 'Google', groupId: 'group-2' }
    ];

    mockChromeTabs.query.mockResolvedValue(tabs);
    mockChromeTabGroups.query.mockResolvedValue([
      { id: 'group-1', title: 'Device A' },
      { id: 'group-2', title: 'Device B 📡' }
    ]);

    const result = await syncChrome();

    expect(mockChromeTabs.query).toHaveBeenCalled();
    expect(result.tabs).toHaveLength(2);
  });

  it('should exclude tabs from synced groups', async () => {
    const tabs = [
      { id: 1, url: 'https://example.com', title: 'Example', groupId: 'group-2' }
    ];

    mockChromeTabs.query.mockResolvedValue(tabs);
    mockChromeTabGroups.query.mockResolvedValue([
      { id: 'group-2', title: 'Device B 📡' }
    ]);

    const result = await syncChrome();

    expect(result.tabs).toHaveLength(0);
  });
});
```

### Phase 3: End-to-End Testing (Priority: Medium)

#### 1. Set up E2E framework

```bash
npm install --save-dev @playwright/test
```

#### 2. Create E2E test scenarios

```
e2e/
├── auth-flow.test.ts
├── sync-cycle.test.ts
├── multi-device.test.ts
├── device-management.test.ts
└── cleanup.test.ts
```

#### 3. Test scenarios

**Authentication Flow:**
- Click extension icon
- Click "Sign in with Google"
- Complete OAuth (mocked)
- Verify token stored
- Verify authenticated state

**Single Device Sync:**
- Open multiple tabs
- Click "Sync Now"
- Verify tabs sent to backend
- Verify device appears in list
- Verify last sync time updated

**Multi-Device Sync:**
- Device A: Sync tabs
- Device B: Sign in and sync
- Verify Device A tabs appear on Device B
- Verify emoji suffix (Chrome) or metadata (Firefox)
- Verify no duplicates on re-sync

**Non-Circular Sync Verification:**
- Sync tabs from device A
- Load device B, sync
- Verify tabs appear with markers
- Sync device B again
- Verify no new tabs created
- Move a synced tab
- Sync again
- Verify tab returns to group (Chrome)

**Device Management:**
- Toggle sync on/off
- Verify sync respects toggle
- Change device color
- Verify color updated
- Adjust tab limit
- Verify limit enforced
- Cleanup device tabs
- Verify all tabs removed

**Browser-Specific Tests:**

**Chrome:**
- Tab group creation with emoji suffix
- Group color matching device color
- Groups collapsed by default
- Moved tabs return on next sync
- Multiple windows handling

**Firefox:**
- Metadata tracking in storage
- URL exclusion from sync
- Tab creation without groups
- Multiple tabs from same device

**Error Handling:**
- API server down
- Network timeout
- Invalid token
- Corrupted storage
- Browser permission denied

**Test Examples:**

```typescript
// e2e/auth-flow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should authenticate with Google OAuth', async ({ page, context }) => {
    // Load extension
    await context.addInitScript({
      path: './extension/dist/bundle.js'
    });

    // Navigate to extension popup (simulated)
    await page.goto('chrome-extension://<id>/popup.html');

    // Click sign in button
    await page.click('button:has-text("Sign in with Google")');

    // Mock OAuth callback (in real test, would need to intercept)
    await page.route('**/auth/callback/google', route => {
      route.fulfill({
        status: 200,
        body: '<html><body><script>window.postMessage({token: "test-jwt-token"}, "*");</script></body></html>'
      });
    });

    // Wait for token storage
    await page.waitForTimeout(1000);

    // Verify authenticated state
    const isAuthenticated = await page.evaluate(() => {
      return document.querySelector('.authenticated') !== null;
    });

    expect(isAuthenticated).toBe(true);
  });
});
```

### Phase 4: Test Documentation (Priority: High)

**This document (TESTING.md) covers:**
1. Setup Instructions - How to run tests
2. Test Structure - Directory organization
3. Running Tests - Commands for unit, integration, E2E tests
4. Writing Tests - Guidelines and patterns
5. Test Coverage - Goals and how to measure
6. CI/CD Integration - GitHub Actions workflow

### Phase 5: CI/CD Integration (Priority: Medium)

**Create `.github/workflows/test.yml`:**

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install backend dependencies
        run: |
          cd backend
          npm ci

      - name: Run backend tests
        run: |
          cd backend
          npm test
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          JWT_SECRET: test-secret-key
          GOOGLE_CLIENT_ID: test-client-id
          GOOGLE_CLIENT_SECRET: test-client-secret

  extension-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install extension dependencies
        run: |
          cd extension
          npm ci

      - name: Run extension tests
        run: |
          cd extension
          npm test

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, extension-tests]

    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm ci
          cd backend && npm ci && cd ..
          cd extension && npm ci && cd ..

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start backend
        run: |
          cd backend
          npm run build
          node dist/server.js &
          sleep 5
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          JWT_SECRET: test-secret-key
          GOOGLE_CLIENT_ID: test-client-id
          GOOGLE_CLIENT_SECRET: test-client-secret
          PORT: 3000

      - name: Run E2E tests
        run: npx playwright test
        env:
          API_URL: http://localhost:3000

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Phase 6: Test Data & Fixtures (Priority: Medium)

**Create test fixtures:**

**backend/src/fixtures/test-data.ts:**
```typescript
import { User, Device, Tab, TabGroup } from '../models';

export const testUserData = {
  email: 'test@example.com',
  name: 'Test User',
  oauthProvider: 'google',
  oauthId: 'google-oauth-id-123'
};

export const testDeviceData = {
  deviceId: 'device-uuid-123',
  name: 'Chrome on Windows',
  browser: 'chrome',
  os: 'Windows'
};

export const testTabData = [
  {
    tabId: 'tab-1',
    url: 'https://example.com',
    title: 'Example',
    faviconUrl: 'https://example.com/favicon.ico',
    active: false,
    windowId: 'window-1',
    index: 0,
    pinned: false,
    lastAccessed: Date.now()
  },
  {
    tabId: 'tab-2',
    url: 'https://google.com',
    title: 'Google',
    faviconUrl: 'https://google.com/favicon.ico',
    active: true,
    windowId: 'window-1',
    index: 1,
    pinned: false,
    lastAccessed: Date.now()
  }
];

export const testTabGroupData = {
  groupId: 'group-1',
  title: 'Work',
  color: 'blue',
  collapsed: false,
  windowId: 'window-1',
  tabs: ['tab-1', 'tab-2']
};

export async function createTestUser() {
  return await User.create(testUserData);
}

export async function createTestDevice(userId: string) {
  return await Device.create({
    ...testDeviceData,
    userId
  });
}

export async function createTestTabs(userId: string, deviceId: string) {
  return await Tab.insertMany(
    testTabData.map(tab => ({
      ...tab,
      userId,
      deviceId
    }))
  );
}
```

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test User.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="User Model"
```

### Extension Tests

```bash
cd extension

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test popup.test.tsx
```

### E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run tests headed (visible browser)
npx playwright test --headed

# Run specific test file
npx playwright test auth-flow.test.ts

# Run tests with UI mode
npx playwright test --ui

# Run tests with debug mode
npx playwright test --debug
```

## Writing Tests

### Guidelines

1. **Arrange-Act-Assert Pattern:**
   ```typescript
   test('should do something', () => {
     // Arrange - setup test data
     const input = { value: 42 };

     // Act - execute code
     const result = functionUnderTest(input);

     // Assert - verify outcome
     expect(result).toBe(42);
   });
   ```

2. **Descriptive Test Names:**
   - Use "should" format: "should create user with valid data"
   - Include the expected behavior
   - Make tests readable as documentation

3. **Test Isolation:**
   - Each test should be independent
   - Clean up after each test (afterEach)
   - Don't rely on test order

4. **Mock External Dependencies:**
   - Mock API calls
   - Mock browser APIs
   - Use in-memory databases

5. **Test Edge Cases:**
   - Empty inputs
   - Null/undefined values
   - Maximum values
   - Error conditions

### Test Coverage Goals

- **Backend**: 80%+ coverage
- **Extension**: 70%+ coverage
- **Critical Paths**: 90%+ coverage
- **Components**: 80%+ coverage

### Measuring Coverage

```bash
# Backend
cd backend
npm run test:coverage

# Extension
cd extension
npm run test:coverage

# Generate HTML report
npm run test:coverage -- --coverageReporters=html
```

Coverage reports will be generated in:
- Backend: `backend/coverage/`
- Extension: `extension/coverage/`

## Testing Best Practices

### 1. Test Pyramid
- **Unit Tests**: 70% - Fast, isolated tests
- **Integration Tests**: 20% - API and database tests
- **E2E Tests**: 10% - Full user journey tests

### 2. Test Organization
- Group related tests (describe blocks)
- Use clear naming conventions
- Separate setup/teardown from test logic

### 3. Test Data
- Use fixtures for common test data
- Generate random data where needed
- Clean up after each test

### 4. Mocking Strategy
- Mock external APIs
- Mock browser APIs
- Use in-memory databases
- Keep mocks simple and focused

### 5. Performance
- Unit tests should run in < 5 seconds
- Integration tests should run in < 30 seconds
- E2E tests should run in < 2 minutes

## Testing Goals

### Coverage Goals
- **Backend**: 80%+ (branches, functions, lines, statements)
- **Extension**: 70%+ overall, 80%+ for critical components
- **Critical Paths**: 90%+ (authentication, sync, device management)

### Quality Goals
- **CI/CD**: All tests must pass before merge
- **Documentation**: Every test case documented
- **Maintainability**: Tests should be easy to update
- **Speed**: Fast feedback loops

### Reliability Goals
- **Flaky Tests**: < 1% (retry机制)
- **Test Stability**: 99%+ pass rate
- **Coverage**: Consistently meet thresholds

## Key Test Scenarios

### Must Have (Critical)

1. **Authentication Flow**
   - OAuth initiation
   - Token generation
   - Token storage
   - Token verification
   - Logout functionality

2. **Basic Sync**
   - Tabs → backend storage
   - Backend → device retrieval
   - Timestamp updates
   - Error handling

3. **Multi-Device Sync**
   - Device A → backend → Device B
   - Bidirectional sync
   - Conflict resolution
   - Timestamp ordering

4. **Non-Circular Sync Verification**
   - No duplicates on re-sync
   - Emoji suffix detection (Chrome)
   - Metadata tracking (Firefox)
   - Tab exclusion logic

5. **Device Toggle**
   - Enable/disable sync per device
   - Verify sync respects toggle
   - State persistence

6. **Tab Limit Enforcement**
   - Default limit (50 tabs)
   - Custom limits (0-100)
   - Limit of 0 (no sync)
   - Maximum limit (100)

7. **Chrome Tab Groups**
   - Group creation with emoji
   - Group color assignment
   - Group updates
