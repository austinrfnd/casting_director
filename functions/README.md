# Cloud Functions

This directory contains the Firebase Cloud Functions for the Casting Director application. These functions act as a secure proxy between the frontend and the Google Gemini API, keeping the API key secure and never exposing it to the client.

## Architecture

The codebase has been refactored into a modular, maintainable structure:

```
functions/
├── index.js                      # Main entry point, exports all Cloud Functions
├── src/
│   ├── functions/                # Cloud Function handlers
│   │   ├── getBookInfo.js       # Book analysis endpoint
│   │   ├── getActorFee.js       # Actor fee estimation endpoint
│   │   └── generateMovieResults.js  # Movie results generation endpoint
│   ├── services/                 # Shared services
│   │   ├── geminiClient.js      # Gemini API client with retry logic
│   │   └── cacheService.js      # Firestore caching utilities
│   ├── config/                   # Configuration
│   │   └── usernames.js         # 90s-style usernames pool
│   └── utils/                    # Utility functions
│       └── helpers.js           # Validation, formatting, error handling
└── test/                         # Test files (mirrors src/ structure)
    ├── getBookInfo.test.js
    ├── getActorFee.test.js
    ├── generateMovieResults.test.js
    ├── geminiClient.test.js
    ├── cacheService.test.js
    ├── usernames.test.js
    └── helpers.test.js
```

## Cloud Functions

### 1. getBookInfo

Analyzes books for film adaptation potential and calculates realistic production budgets.

**Endpoint:** `POST /getBookInfo`

**Request Body:**
```json
{
  "bookName": "Harry Potter and the Sorcerer's Stone",
  "author": "J.K. Rowling"
}
```

**Response:**
```json
{
  "popularity": "Massive Bestseller",
  "synopsis": "A young wizard discovers his magical heritage...",
  "characters": [
    {
      "name": "Harry Potter",
      "description": "An 11-year-old orphan who discovers he is a wizard"
    }
  ],
  "movieBudget": 125000000,
  "castingBudget": 30000000,
  "studio": "Warner Bros",
  "budgetReasoning": "Congratulations! Your movie has been bought by Warner Bros!..."
}
```

**Features:**
- Analyzes book popularity and market potential
- Calculates realistic production budgets ($1M - $300M)
- Selects appropriate studio based on budget
- Identifies 4 main characters for casting
- Uses Gemini 2.5 Flash for fast analysis

### 2. getActorFee

Estimates per-movie booking fees and popularity levels for actors with intelligent caching.

**Endpoint:** `POST /getActorFee`

**Request Body:**
```json
{
  "actorName": "Tom Hanks"
}
```

**Response:**
```json
{
  "fee": 15000000,
  "popularity": "A-List Star"
}
```

**Features:**
- Estimates realistic actor fees
- Categorizes popularity (A-List, Working Actor, Up-and-Comer)
- Implements 30-day Firestore caching to reduce API calls
- Graceful cache degradation (continues without cache on failures)
- Uses Gemini 2.5 Flash for fast estimates

### 3. generateMovieResults

Generates hypothetical box office performance, awards, and critical reception based on cast and production data.

**Endpoint:** `POST /generateMovieResults`

**Request Body:**
```json
{
  "bookName": "Harry Potter",
  "bookPopularity": "Massive Bestseller",
  "movieBudget": 125000000,
  "castingBudget": 30000000,
  "spentBudget": 28000000,
  "wentOverBudget": false,
  "castDetails": "Harry: Daniel Radcliffe ($5M), Hermione: Emma Watson ($3M)..."
}
```

**Response:**
```json
{
  "boxOffice": 974800000,
  "awards": [
    "Best Visual Effects (Oscar)",
    "Best Art Direction (Oscar)",
    "Best Original Score (Oscar)"
  ],
  "summary": "This magical adaptation enchanted audiences worldwide..."
}
```

**Features:**
- Analyzes cast fit and popularity impact
- Considers budget management (over/under budget)
- Generates realistic box office projections
- Awards predictions (Oscars, Razzies, etc.)
- Fun, snarky 90s movie critic tone
- Uses Gemini 2.5 Pro for creative generation
- 2-minute timeout for complex AI processing

## Core Services

### Gemini Client (`src/services/geminiClient.js`)

Centralized Google Gemini API client with robust error handling and retry logic.

**Features:**
- Exponential backoff retry logic (6 attempts max)
- Jitter to prevent thundering herd
- Special handling for 503 errors (longer delays)
- Model selection (Flash vs Pro)
- JSON schema enforcement
- Non-retryable error detection (4xx errors)

**Usage:**
```javascript
const { callGeminiAPI, callGeminiProAPI } = require('./services/geminiClient');

// Use Flash model (default)
const result = await callGeminiAPI(apiKey, userQuery, systemPrompt, jsonSchema);

// Use Pro model (for creative tasks)
const result = await callGeminiProAPI(apiKey, userQuery, systemPrompt, jsonSchema);
```

### Cache Service (`src/services/cacheService.js`)

Firestore-based caching for actor data with TTL management.

**Features:**
- 30-day cache TTL
- Normalized actor names (lowercase, trimmed)
- Graceful degradation (cache failures don't break functionality)
- Automatic expiration checking
- Server-side timestamps

**Usage:**
```javascript
const { getCachedActorData, setCachedActorData } = require('./services/cacheService');

// Check cache
const cached = await getCachedActorData(db, 'Tom Hanks');
if (!cached) {
  // Fetch fresh data
  const data = await fetchFromAPI();
  // Cache it
  await setCachedActorData(db, 'Tom Hanks', data);
}
```

## Utility Modules

### Helpers (`src/utils/helpers.js`)

Common validation, formatting, and error handling utilities.

**Functions:**
- `validateRequiredParams(body, requiredParams)` - Parameter validation
- `sendError(res, statusCode, message, details)` - Standard error responses
- `sendSuccess(res, data, message)` - Standard success responses
- `formatCurrency(amount)` - Format numbers as USD currency
- `parseCurrency(currencyString)` - Parse currency strings to numbers
- `isNonEmptyString(value)` - String validation
- `isPositiveNumber(value)` - Number validation
- `sanitizeString(str)` - Clean and trim strings
- `truncateString(str, maxLength, suffix)` - String truncation

### Usernames (`src/config/usernames.js`)

Pool of 90s-style internet usernames for authentic retro feel (will be expanded to 100+ for movie enhancement feature).

**Styles:**
- xX_name_Xx format (e.g., `xXDarkAngelXx`)
- Pop culture references (e.g., `TitanicFan97`)
- Underscore style (e.g., `sad_film_goblin`)
- Leetspeak (e.g., `M0v13M4st3r`)
- Early internet memes (e.g., `AllYourBase2000`)

## Testing

Comprehensive test suite with **201 passing tests** covering all functionality.

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/geminiClient.test.js

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage

- **geminiClient.test.js** (22 tests) - API calls, retry logic, error handling, model selection
- **cacheService.test.js** (26 tests) - Caching, TTL, expiration, graceful degradation
- **usernames.test.js** (19 tests) - Username pool quality, uniqueness, 90s authenticity
- **helpers.test.js** (50 tests) - All utility functions, edge cases, validation
- **getBookInfo.test.js** (32 tests) - Book analysis, schema validation, API integration
- **getActorFee.test.js** (28 tests) - Actor fees, caching integration, error handling
- **generateMovieResults.test.js** (24 tests) - Movie results, query building, Pro API usage

## Development

### Prerequisites

- Node.js 20
- Firebase CLI
- Firebase project with Firestore enabled
- Google Gemini API key

### Environment Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Firebase secret for Gemini API key:
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```

3. Run tests:
   ```bash
   npm test
   ```

### Local Testing

```bash
# Start Firebase emulator
firebase emulators:start

# In another terminal, run tests against emulator
npm test
```

### Deployment

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:getBookInfo
```

## API Response Format

All endpoints use a standardized response format:

**Success Response:**
```json
{
  ...data fields...
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "statusCode": 400,
  "details": {
    "missing": ["field1", "field2"]
  }
}
```

## Performance & Optimization

- **Caching:** Actor fees cached for 30 days in Firestore
- **Retry Logic:** Exponential backoff with jitter for failed API calls
- **Model Selection:** Flash for fast queries, Pro for creative generation
- **Timeouts:** Extended 2-minute timeout for complex AI operations
- **Graceful Degradation:** Cache failures don't break functionality

## Security

- API keys stored as Firebase secrets
- Never exposed to client
- CORS enabled for authorized origins
- Input validation on all endpoints
- Non-retryable error handling to prevent infinite loops

## Contributing

When adding new functionality:

1. Create module in appropriate directory (`functions/`, `services/`, `config/`, `utils/`)
2. Write comprehensive tests first
3. Follow existing patterns (exports, error handling, logging)
4. Update this README with new functionality
5. Run full test suite before committing

## Troubleshooting

### Common Issues

**"API call failed" errors:**
- Check Gemini API key is set correctly
- Verify API quota hasn't been exceeded
- Check Gemini API status

**Cache errors:**
- Verify Firestore is enabled
- Check Firebase project permissions
- Review Firestore rules

**Test failures:**
- Clear Jest cache: `npm test -- --clearCache`
- Check mock dependencies are properly configured
- Verify test data matches current schema

## Future Enhancements

Planned for movie completion enhancement feature:
- Expand username pool to 100+ entries
- Add IMDB, Letterboxd, Rotten Tomatoes scores
- Implement casting scores for each actor
- Generate Siskel and Ebert style reviews
- Add user reviews with 90s usernames
