# Tabbycat Testing Implementation Guide

## Overview

This guide provides a comprehensive implementation plan for testing the Tabbycat browser extension and backend API. The testing strategy uses Jest for both backend and extension testing, with integration testing for end-to-end workflows.

## Quick Start

### Backend Testing Setup

```bash
cd backend

# Install dependencies
npm install --save-dev jest ts-jest @types/jest @types/node mongodb-memory-server supertest

# Create test configuration
cp jest.config.js tests/setup.ts

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Extension Testing Setup

```bash
cd extension

# Install dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Test Structure

```
tabbycat/
├── backend/
│   ├── tests/
│   │   ├── setup.ts                    # Test setup with MongoDB
│   │   ├── routes/
│   │   │   ├── auth.test.ts           # Authentication tests
│   │   │   ├── sync.test.ts           # Sync endpoint tests
│   │   │   └── devices.test.ts        # Device management tests
│   │   ├── middleware/
│   │   │   └── auth.test.ts           # Auth middleware tests
│   │   ├── models/
│   │   │   ├── User.test.ts           # User model tests
│   │   │   ├── Device.test.ts         # Device model tests
│   │   │   ├── Tab.test.ts            # Tab model tests
│   │   │   └── TabGroup.test.ts       # TabGroup model tests
│   │   └── integration/
│   │       ├── apiCommunication.test.ts  # API integration tests
│   │       ├── syncFlow.test.ts            # Sync flow tests
│   │       └── authenticationFlow.test.ts  # Auth flow tests
│   └── jest.config.js                 # Jest configuration
└── extension/
    ├── tests/
    │   ├── popup.test.tsx             # Popup component tests
    │   ├── options.test.tsx           # Options component tests
    │   ├── deviceManagement.test.tsx  # Device management tests
    │   ├── authentication.test.tsx    # Authentication flow tests
    │   └── storage.test.ts            # Storage tests
    └── jest.config.js                 # Jest configuration
```

## Backend Test Cases

### Authentication Tests (`backend/tests/routes/auth.test.ts`)

**Key Test Cases:**
- Google OAuth redirect with correct parameters
- OAuth callback creates/updates users
- JWT token generation and validation
- Token polling and cleanup
- Authentication verification
- Error handling for invalid requests

**Coverage Areas:**
- OAuth flow implementation
- JWT token management
- User database operations
- HTML response generation
- Token cleanup mechanisms

### Sync Tests (`backend/tests/routes/sync.test.ts`)

**Key Test Cases:**
- Tab and group synchronization
- Device metadata updates
- Other devices' tabs retrieval
- Data integrity preservation
- Error handling and graceful degradation
- Tab limits enforcement

**Coverage Areas:**
- Tab data integrity
- Group data integrity
- Device synchronization
- Error scenarios
- Performance constraints

### Device Tests (`backend/tests/routes/devices.test.ts`)

**Key Test Cases:**
- Device listing with tabs
- Device registration/upsert
- Device metadata management
- Sorting by last sync time
- Error handling
- Browser and OS validation

**Coverage Areas:**
- Device CRUD operations
- User device separation
- Tab retrieval limits
- Database error handling

### Model Tests

**User Model:** User creation, validation, duplicate prevention
**Device Model:** Device registration, updates, unique constraints
**Tab Model:** Tab data integrity, unique constraints, optional fields
**TabGroup Model:** Group data integrity, unique constraints, tabs array

## Extension Test Cases

### Popup Tests (`extension/tests/popup.test.tsx`)

**Key Test Cases:**
- Authentication status display
- Device list rendering
- Device sorting and formatting
- Sync status indicators
- Device controls (toggle, color, limit)
- Error handling
- Loading states
- Responsive design

**Coverage Areas:**
- React component rendering
- State management
- User interactions
- Error display
- Performance considerations

### Options Tests

**Settings persistence**
- Device name configuration
- Sync interval settings
- Auto-sync toggle
- Notification preferences

### Device Management Tests

**UI components:**
- Color picker functionality
- Tab limit input validation
- Cleanup button behavior
- Device removal confirmation

### Authentication Tests

**OAuth flow:**
- Login button display
- Google OAuth integration
- Token storage
- Manual token copy
- Error handling

### Storage Tests

**Chrome storage:**
- Token save/retrieve
- Storage errors
- Cleanup operations

## Integration Tests

### API Communication Tests

**Test Scenarios:**
- Extension → API sync requests
- API → Extension response handling
- Error scenarios and recovery
- Data integrity verification

### Sync Flow Tests

**End-to-End Scenarios:**
- Device A syncs tabs
- Device B receives and displays tabs
- Tab structure preservation
- Non-circular sync verification
- Multi-device synchronization

### Authentication Flow Tests

**Complete OAuth Flow:**
- User initiates login
- Google authentication
- Token retrieval
- Storage verification
- Logout functionality

## Running Tests

### Backend Tests

```bash
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

# Run with specific coverage
npm test -- --coverage --coveragePathIgnorePatterns='node_modules'
```

### Extension Tests

```bash
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

# Run with specific coverage
npm test -- --coverage --coveragePathIgnorePatterns='node_modules'
```

## Test Coverage Goals

- **Backend Routes**: 80%+ coverage
- **Backend Models**: 90%+ coverage
- **Extension Components**: 70%+ coverage
- **Integration Flows**: 90%+ coverage
- **Critical Path**: 100% coverage

## CI/CD Integration

### GitHub Actions Workflow

```yaml
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
      - name: Install Dependencies
        run: |
          cd backend
          npm ci
      - name: Run Tests
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
      - name: Install Dependencies
        run: |
          cd extension
          npm ci
      - name: Run Tests
        run: |
          cd extension
          npm test -- --coverage --maxWorkers=2
```

## Test Best Practices

1. **Critical Path First**: Test authentication and sync endpoints before UI components
2. **Isolation**: Each test should be independent and not depend on other tests
3. **Clean Up**: Use afterEach to clean up test data
4. **Mocking**: Mock external dependencies (API, storage, etc.)
5. **Descriptive Names**: Use clear test descriptions
6. **Edge Cases**: Test error scenarios and boundary conditions
7. **Performance**: Monitor test execution time and optimize slow tests
8. **Coverage**: Track coverage trends and aim for consistent improvement

## Test Maintenance

### Regular Tasks
- Update tests when code changes
- Remove obsolete tests
- Review flaky tests
- Monitor coverage trends
- Update test utilities

### Quarterly Reviews
- Test strategy evaluation
- Tool updates
- Best practices review
- Performance optimization

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors**
   - Ensure MongoDB is running
   - Check connection string in environment variables
   - Use in-memory MongoDB for testing

2. **Test Timeout Issues**
   - Increase timeout for slow tests
   - Optimize test setup/teardown
   - Reduce database operations

3. **Flaky Tests**
   - Add proper cleanup
   - Use stable test data
   - Add timeouts where appropriate

4. **Coverage Issues**
   - Review untested code paths
   - Add missing tests
   - Review coverage configuration

## Next Steps

1. **Immediate Actions**:
   - Install testing dependencies
   - Create test configuration files
   - Set up test directory structure
   - Implement critical path tests

2. **Week 1 Focus**:
   - Backend authentication tests
   - Backend sync tests
   - Backend device tests
   - Extension authentication tests

3. **Week 2 Focus**:
   - Extension popup tests
   - Extension options tests
   - Backend model tests
   - Basic integration tests

4. **Week 3+ Focus**:
   - Advanced UI tests
   - Complete integration tests
   - Edge case testing
   - Performance optimization

## Support and Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Docs](https://testing-library.com/docs)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Supertest](https://github.com/visionmedia/supertest)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)

## Summary

This testing implementation provides a comprehensive approach to ensuring the reliability and quality of the Tabbycat extension. By following this plan, you can systematically test all components, identify issues early, and maintain high code quality throughout development.

The testing strategy emphasizes:
- **Critical path testing** for authentication and sync
- **Component isolation** for easy debugging
- **Integration testing** for end-to-end workflows
- **Continuous improvement** through coverage tracking
- **CI/CD integration** for automated testing
