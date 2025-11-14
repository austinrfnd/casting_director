# Cloud Functions Refactoring Plan

**Created:** November 13, 2025
**Status:** Ready for Implementation
**Priority:** HIGH - Should be done BEFORE movie completion enhancement

---

## Current State

**Problem:** All Cloud Functions are in a single `functions/index.js` file (423 lines), which will become significantly larger and harder to maintain with the movie completion enhancement feature.

**Current Structure:**
```
functions/
├── index.js (423 lines)
│   ├── callGeminiAPI() helper
│   ├── getActorDataWithCache() helper
│   ├── getBookInfo() function
│   ├── getActorFee() function
│   └── generateMovieResults() function
├── index.test.js (16,065 lines)
└── package.json
```

---

## Proposed Structure

**Goal:** Separate concerns into logical modules while maintaining Firebase Functions v2 compatibility.

```
functions/
├── index.js (main exports - ~50 lines)
├── src/
│   ├── functions/
│   │   ├── getBookInfo.js (~150 lines)
│   │   ├── getActorFee.js (~100 lines)
│   │   └── generateMovieResults.js (~200 lines, will grow to ~400)
│   ├── services/
│   │   ├── geminiClient.js (~120 lines)
│   │   └── cacheService.js (~100 lines)
│   ├── config/
│   │   └── usernames.js (~150 lines - 90s username pool)
│   └── utils/
│       └── helpers.js (~50 lines)
├── test/
│   ├── getBookInfo.test.js
│   ├── getActorFee.test.js
│   └── generateMovieResults.test.js
└── package.json
```

---

## File Breakdown

### 1. index.js (Main Exports)

**Purpose:** Entry point for Firebase Functions, exports all HTTP functions

```javascript
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const geminiApiKey = defineSecret("GEMINI_API_KEY");
admin.initializeApp();

// Import function handlers
const { getBookInfo } = require("./src/functions/getBookInfo");
const { getActorFee } = require("./src/functions/getActorFee");
const { generateMovieResults } = require("./src/functions/generateMovieResults");

// Export Firebase Functions
exports.getBookInfo = onRequest(
  {
    cors: true,
    secrets: [geminiApiKey],
  },
  getBookInfo
);

exports.getActorFee = onRequest(
  {
    cors: true,
    secrets: [geminiApiKey],
  },
  getActorFee
);

exports.generateMovieResults = onRequest(
  {
    cors: true,
    secrets: [geminiApiKey],
    timeoutSeconds: 120,
  },
  generateMovieResults
);
```

---

### 2. src/functions/getBookInfo.js

**Purpose:** Book analysis and budget calculation

**Exports:** `getBookInfo(req, res)`

**Dependencies:**
- geminiClient.js for API calls
- helpers.js for validation

**Content:**
- Request validation
- AI prompt construction
- Response schema
- Error handling

---

### 3. src/functions/getActorFee.js

**Purpose:** Actor fee estimation with caching

**Exports:** `getActorFee(req, res)`

**Dependencies:**
- cacheService.js for cache operations
- geminiClient.js for API calls
- helpers.js for validation

**Content:**
- Request validation
- Cache-first logic
- AI prompt for fee estimation
- Response formatting

---

### 4. src/functions/generateMovieResults.js

**Purpose:** Comprehensive movie results generation (most complex)

**Exports:** `generateMovieResults(req, res)`

**Dependencies:**
- geminiClient.js for API calls (Gemini 2.5 Pro)
- usernames.js for 90s username pool
- helpers.js for validation

**Content:**
- Request validation
- Complex AI prompt with all platform reviews
- Casting scores logic
- Siskel & Ebert verdict
- Overall game score
- Response schema (large)
- Username attribution

**Note:** This file will be ~400 lines after enhancement feature implementation.

---

### 5. src/services/geminiClient.js

**Purpose:** Centralized Gemini API client with retry logic

**Exports:**
```javascript
module.exports = {
  callGeminiAPI,
  callGeminiProAPI  // For complex calls like generateMovieResults
};
```

**Content:**
- Exponential backoff retry logic
- Network error handling
- 503/429 special handling
- JSON response parsing
- Support for both Flash and Pro models

**Key Functions:**
- `callGeminiAPI(apiKey, prompt, schema, model = 'gemini-2.5-flash')`
- `callGeminiProAPI(apiKey, prompt, schema)` - wrapper that uses Pro model

---

### 6. src/services/cacheService.js

**Purpose:** Firestore caching operations for actor data

**Exports:**
```javascript
module.exports = {
  getCachedActorData,
  setCachedActorData,
  isExpired
};
```

**Content:**
- Cache key normalization
- TTL (30-day) logic
- Firestore read/write operations
- Error handling (graceful degradation)

**Functions:**
- `getCachedActorData(db, actorName)` - returns cached data or null
- `setCachedActorData(db, actorName, data)` - stores in cache
- `isExpired(cachedAt)` - checks if cache entry is expired (30 days)

---

### 7. src/config/usernames.js

**Purpose:** 90s username pool for review attribution

**Exports:**
```javascript
module.exports = {
  USERNAMES_90S,
  getRandomUsername
};
```

**Content:**
- Array of 100+ authentic 90s usernames
- Random selection function
- Organized by category (xX format, pop culture, leetspeak, etc.)

---

### 8. src/utils/helpers.js

**Purpose:** Shared utility functions

**Exports:**
```javascript
module.exports = {
  validateRequest,
  handleError,
  normalizeActorName,
  formatResponse
};
```

**Content:**
- Request validation helpers
- Error response formatting
- Common transformations
- Shared constants

---

## Migration Steps

### Phase 1: Set Up New Structure (No Breaking Changes)

1. Create new directory structure:
   ```bash
   mkdir -p functions/src/{functions,services,config,utils}
   mkdir -p functions/test
   ```

2. Create src/services/geminiClient.js
   - Extract `callGeminiAPI()` from index.js
   - Add `callGeminiProAPI()` wrapper
   - Add model parameter support
   - Test independently

3. Create src/services/cacheService.js
   - Extract `getActorDataWithCache()` logic from index.js
   - Split into separate functions (get, set, isExpired)
   - Test independently

4. Create src/utils/helpers.js
   - Extract validation and formatting utilities
   - Add common error handlers

5. Create src/config/usernames.js
   - Add 90s username pool (from enhancement spec)
   - Add getRandomUsername() function

### Phase 2: Extract Functions (One at a Time)

6. Create src/functions/getBookInfo.js
   - Extract getBookInfo implementation
   - Update imports to use new services
   - Keep index.js export unchanged
   - Test: Ensure function still works

7. Create src/functions/getActorFee.js
   - Extract getActorFee implementation
   - Update imports to use cacheService
   - Keep index.js export unchanged
   - Test: Ensure function still works

8. Create src/functions/generateMovieResults.js
   - Extract generateMovieResults implementation
   - Update imports to use geminiClient and usernames
   - Keep index.js export unchanged
   - Test: Ensure function still works

### Phase 3: Update index.js

9. Simplify index.js to ~50 lines
   - Remove all implementation code
   - Import from src/functions/*
   - Keep only Firebase Function exports
   - Verify all functions still work

### Phase 4: Update Tests

10. Split index.test.js into separate files:
    - test/getBookInfo.test.js
    - test/getActorFee.test.js
    - test/generateMovieResults.test.js
    - test/geminiClient.test.js
    - test/cacheService.test.js

11. Update test imports to use new modules

12. Run full test suite: `npm test` in functions directory

### Phase 5: Deployment Test

13. Deploy to Firebase:
    ```bash
    firebase deploy --only functions
    ```

14. Test all three endpoints in production:
    - getBookInfo: Test with a book
    - getActorFee: Test with an actor
    - generateMovieResults: Test full movie creation

15. Verify no regressions

---

## Benefits

✅ **Maintainability:** Each function in its own file (~150-400 lines)
✅ **Testability:** Easier to write focused unit tests
✅ **Readability:** Clear separation of concerns
✅ **Scalability:** Easy to add new functions
✅ **Debugging:** Easier to locate issues
✅ **Collaboration:** Multiple developers can work on different functions
✅ **Reusability:** Shared services (geminiClient, cacheService) can be used across functions
✅ **Preparation:** Ready for movie enhancement feature complexity

---

## Risks & Mitigations

**Risk 1: Breaking existing functionality**
- Mitigation: Migrate one function at a time, test after each step
- Keep index.js exports unchanged during migration

**Risk 2: Import/export issues**
- Mitigation: Use CommonJS (require/module.exports) consistently
- Test locally before deploying

**Risk 3: Firebase Functions v2 compatibility**
- Mitigation: Keep onRequest wrappers in index.js
- Don't change function signatures

**Risk 4: Deployment issues**
- Mitigation: Deploy to staging/dev environment first if available
- Have rollback plan (revert commit)

---

## Testing Checklist

**After Each Phase:**
- [ ] All three functions still work locally
- [ ] All tests pass
- [ ] No linter errors
- [ ] No TypeScript errors (if using)

**Before Final Deployment:**
- [ ] Full test suite passes
- [ ] Manual testing of all three endpoints
- [ ] No console errors
- [ ] Response schemas unchanged
- [ ] Performance is similar (no regression)

---

## Timeline

- **Phase 1** (Setup): 30 minutes
- **Phase 2** (Extract Functions): 1.5 hours
- **Phase 3** (Update index.js): 20 minutes
- **Phase 4** (Update Tests): 1 hour
- **Phase 5** (Deploy & Test): 30 minutes
- **Total: ~3.5 hours**

---

## Implementation Order

1. **Do this refactoring FIRST** (before movie enhancement)
2. Test and deploy refactored structure
3. THEN implement movie completion enhancement feature

**Why this order:**
- Cleaner starting point for complex feature
- Easier to review changes (refactor separate from new feature)
- Less risk of breaking things
- Better git history

---

**End of Refactoring Plan**

*Ready for implementation approval.*
