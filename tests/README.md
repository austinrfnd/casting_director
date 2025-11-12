# Test Documentation

This directory contains the test suite for the Casting Director application.

## Test Types

### End-to-End Tests (E2E)
**Location:** `casting-flow.spec.js`
**Framework:** Playwright
**Purpose:** Test the complete user flow from the browser perspective

#### What's Tested:
- **Main Application Flow**
  - Homepage loads with correct title and header
  - Book and author fields pre-populate with random defaults
  - Director ID displays after Firebase authentication
  - Navigation between screens (Screen 1 → Screen 2 → Screen 3)
  - Form validation (book and author fields required)
  - Loading states during API calls
  - Returning to main menu from different screens

- **Recent Movies Feature**
  - Recent movies section displays correctly
  - Refresh button functionality

- **Welcome Screen**
  - Shows on first visit (with localStorage cleared)
  - Can be dismissed with boot button
  - Can be dismissed with Enter key
  - Doesn't show on subsequent visits (after being dismissed)

- **Error Handling**
  - Graceful handling of API errors

#### Test Configuration:
- **Base URL:** `http://localhost:5002` (Firebase local hosting)
- **Browser:** Chromium
- **Workers:** 1 (sequential execution to avoid API rate limits)
- **Timeout:** 60 seconds per test
- **Screenshots:** Captured on failure
- **Videos:** Retained on failure

## Integration Tests

### Firebase Functions Tests
**Location:** `../functions/index.test.js`
**Framework:** Jest
**Purpose:** Test Firebase Cloud Functions with mocked Gemini API calls

#### What's Tested:
- **getBookInfo Function**
  - Returns book information (popularity, synopsis, characters)
  - Validates required parameters (bookName, author)
  - Rejects non-POST requests
  - Handles API errors gracefully

- **getActorFee Function**
  - Returns actor fee and popularity
  - Validates required parameters (actorName)
  - Proper error responses

- **generateMovieResults Function**
  - Generates box office results, awards, and summary
  - Validates all required fields
  - Handles complex request payloads

- **API Retry Logic**
  - Retries on 429 rate limit errors (with exponential backoff)
  - Does NOT retry on 4xx errors (except 429)
  - Proper timeout and error handling

#### Mocking Strategy:
- **Gemini API calls are mocked** using `jest.fn()` to avoid actual API requests
- Mock HTTP request/response objects simulate Firebase Functions environment
- Secrets (GEMINI_API_KEY) are mocked for security
- Firebase Admin SDK is mocked to prevent initialization errors

## Running Tests

### Run E2E Tests
```bash
npm test
```

### Run Integration Tests
```bash
cd functions && npm test
```

### Run Specific E2E Test
```bash
npx playwright test --grep "should load the homepage"
```

### View Test Report
```bash
npx playwright show-report
```

## Test Status

### Current Results:
- **E2E Tests:** 15/15 passing (100%) ✅
- **Integration Tests:** 10/10 passing (100%) ✅

### Prerequisites for E2E Tests:
- Firebase emulators must be running with both hosting and functions: `firebase emulators:start --only functions,hosting`
- Gemini API key must be configured in `.secret.local` file

## Prerequisites

- Node modules installed: `npm install` (root) and `cd functions && npm install`
- Playwright browsers installed: `npx playwright install`
- Firebase emulators running: `firebase emulators:start --only functions,hosting`
- Gemini API key configured in `.secret.local` (see setup instructions above)

## Test Development Guidelines

1. **Always dismiss the welcome screen** in `beforeEach` hooks for E2E tests
2. **Mock external API calls** in integration tests
3. **Use descriptive test names** that explain what behavior is being tested
4. **Include timeouts** for API-dependent tests
5. **Clean up resources** in `afterEach` or `afterAll` hooks
