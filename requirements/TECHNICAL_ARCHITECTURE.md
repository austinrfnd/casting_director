# Casting Director - Technical Architecture Documentation

**Last Updated:** November 13, 2025
**Current Version:** 94c97e9 (main branch)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Application Flow](#3-application-flow)
4. [Core Systems](#4-core-systems)
5. [Cloud Functions](#5-cloud-functions)
6. [Data Models](#6-data-models)
7. [Key Features](#7-key-features)
8. [UI/UX System](#8-uiux-system)
9. [Testing](#9-testing)
10. [Deployment](#10-deployment)
11. [Quick Reference](#quick-reference)

---

## 1. Project Overview

**Casting Director** is a retro 90s DOS-style web game where players act as Hollywood casting directors, adapting bestselling books into movies. The game uses Google's Gemini AI to analyze books, estimate actor fees, and generate movie results.

### Technologies Used
- **Frontend:** Vanilla JavaScript (ES6 modules), HTML5, CSS3
- **Backend:** Firebase Cloud Functions (Node.js 20)
- **Database:** Firebase Firestore
- **Authentication:** Firebase Anonymous Auth
- **AI:** Google Gemini 2.5 Flash API
- **Testing:** Playwright (e2e tests), Jest (unit tests)
- **Hosting:** Firebase Hosting

### Live URL
- Production: https://casting-director-1990.web.app

---

## 2. Project Structure

### Directory Layout
```
casting_director/
├── index.html                    # Main HTML file (275 lines)
├── app.js                        # Main application logic (1,342 lines)
├── version.js                    # Auto-generated version info
├── generate-version.js           # Version generation script
├── package.json                  # Root package config
├── firebase.json                 # Firebase configuration
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore indexes
├── playwright.config.js         # Playwright test config
│
├── css/                         # Organized CSS modules
│   ├── base.css                # Root variables, body, container (86 lines)
│   ├── forms.css               # Input fields, buttons (38 lines)
│   ├── components.css          # Reusable components (135 lines)
│   ├── screen1.css             # Screen 1 specific styles
│   ├── screen1_5-loading.css   # Loading screen styles (97 lines)
│   ├── screen2.css             # Budget reveal styles
│   └── welcome-screen.css      # Welcome screen styles (156 lines)
│
├── functions/                   # Firebase Cloud Functions
│   ├── index.js                # Function implementations (423 lines)
│   ├── index.test.js           # Function tests (16,065 lines)
│   ├── package.json            # Function dependencies
│   └── node_modules/           # Function dependencies
│
├── tests/                       # End-to-end tests
│   ├── casting-flow.spec.js    # Main test suite (433 lines)
│   └── README.md               # Test documentation
│
├── images/                      # Static image assets
│   ├── offer_accepted.png      # Screen 1.5 offer image
│   └── casting_director_cover.png  # Welcome screen cover
│
└── requirements/                # Feature specifications
    ├── dynamic-budget-system.md
    ├── leaderboard.md
    └── screen-1.5-wireframe.md
```

### Key Files and Their Purposes

#### index.html (275 lines)
- Single-page application structure
- Contains all 5 main screens (screen1-5)
- Welcome screen overlay
- Loading overlay and modal dialog
- Links to modular CSS files
- Imports app.js as ES6 module

#### app.js (1,342 lines)
**Major Sections:**
- Lines 15-36: Firebase SDK imports
- Lines 48-98: Configuration and constants
- Lines 104-291: 200 famous books library
- Lines 297-338: Global state management
- Lines 342-448: Utility functions
- Lines 454-584: Cloud Function API calls
- Lines 590-821: Firebase functions
- Lines 827-1096: Game logic functions
- Lines 1102-1283: Event listeners
- Lines 1290-1341: Initialization

#### functions/index.js (423 lines)
- Three Cloud Functions: getBookInfo, getActorFee, generateMovieResults
- Gemini API wrapper with retry logic (lines 22-100)
- Actor data caching system (lines 231-297)
- CORS enabled for all functions

---

## 3. Application Flow

### Complete User Journey

```
┌────────────────────────────────────────────────────────────┐
│ FIRST VISIT: Welcome Screen                                │
│ - Shows game introduction and mission                      │
│ - "BOOT SYSTEM" button or Enter key to dismiss            │
│ - Stored in localStorage to not show again                │
│ Files: index.html (210-253), app.js (422-448)            │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ SCREEN 1: Book Entry & Recent Movies                       │
│ - Random default book pre-populated from 200-book library  │
│ - User enters book title and author                        │
│ - Shows "Recently Cast Movies" list (Firestore query)     │
│ - Firebase authentication happens in background            │
│ Files: index.html (29-59), app.js (1107-1171)            │
└────────────────────────────────────────────────────────────┘
                            ↓ [LOAD PROJECT clicked]
┌────────────────────────────────────────────────────────────┐
│ SCREEN 1.5: Incoming Offer (Loading Screen)               │
│ - Shows offer_accepted.png image                          │
│ - Loading bar with "ANALYZING BOOK DATA..." text          │
│ - Animated progress bar with diagonal stripes             │
│ - Calls Cloud Function: getBookInfo                        │
│ - Click anywhere to skip once loaded                       │
│ Files: index.html (62-76), app.js (1116-1170)            │
│ Duration: ~2-5 seconds (API call + 2 second pause)        │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ SCREEN 2: Budget Reveal (Studio Deal Memo)                │
│ - Displays project title                                   │
│ - Shows studio name (Warner Bros, A24, etc.)              │
│ - Movie budget (AI-calculated, $1M-$300M)                 │
│ - Casting budget (typically 20-30% of movie budget)       │
│ - Studio message with budget reasoning (4-6 sentences)    │
│ - Buttons: [START CASTING] [MAIN MENU]                    │
│ Files: index.html (78-114), app.js (832-838)             │
└────────────────────────────────────────────────────────────┘
                            ↓ [START CASTING clicked]
┌────────────────────────────────────────────────────────────┐
│ SCREEN 3: Casting Deck                                     │
│ - Shows total casting budget and spent budget              │
│ - 4 character cards (from AI analysis of book)            │
│ - Each card has:                                           │
│   • Character name (cyan colored)                          │
│   • Character description                                  │
│   • Actor name input field                                 │
│   • [CAST] button                                          │
│   • "Go No-Name ($100,000)" checkbox                       │
│ - Cast an actor:                                           │
│   1. Type actor name → click CAST                          │
│   2. Calls Cloud Function: getActorFee (with caching)     │
│   3. Shows: "CAST: [Actor] ($X) [X]"                      │
│   4. [X] button to recast                                  │
│ - No-Name option: instant $100k fee, no API call          │
│ - Budget tracking: turns red if over budget                │
│ - All roles must be cast to proceed                        │
│ Files: index.html (116-136), app.js (845-1055)           │
└────────────────────────────────────────────────────────────┘
                            ↓ [MAKE THE MOVIE! clicked]
┌────────────────────────────────────────────────────────────┐
│ SCREEN 4: Box Office Results                               │
│ - Calls Cloud Function: generateMovieResults               │
│ - Shows:                                                   │
│   • Project title                                          │
│   • Final budget                                           │
│   • Box office revenue (AI-generated)                      │
│   • Complete cast list with fees                           │
│   • Awards won (or "None. Not even a nomination.")        │
│   • 1-2 paragraph snarky summary                           │
│ - Movie saved to Firestore (non-blocking)                 │
│ - Button: [NEW PROJECT] (reloads page)                     │
│ Files: index.html (138-170), app.js (1212-1257)          │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ SCREEN 5: Movie Details (from recent movies list)         │
│ - Shows detailed view of any completed movie               │
│ - Same layout as Screen 4 but for any director's movie    │
│ - URL includes movieId query parameter                     │
│ - Button: [BACK TO MAIN]                                   │
│ Files: index.html (172-207), app.js (745-821)            │
└────────────────────────────────────────────────────────────┘
```

### Screen Transitions

**State Management:**
- File: [app.js:310-331](app.js#L310-L331)
- Global `state` object tracks current project data

**Navigation Functions:**
- `showScreen(screenId)` - [app.js:349](app.js#L349) - Hides all screens, shows target
- Each screen has unique ID: screen1, screen1_5, screen2, screen3, screen4, screen5
- Active screen has `.active` CSS class

---

## 4. Core Systems

### 4.1 Book/Movie Lookup System

**Entry Point:** Screen 1 → LOAD PROJECT button
**File:** [app.js:1107-1171](app.js#L1107-L1171)

**Flow:**
1. User enters book title and author
2. Validation: both fields required ([app.js:1111](app.js#L1111))
3. Shows Screen 1.5 (loading screen)
4. Calls `callGetBookInfo(bookName, author)` ([app.js:1139](app.js#L1139))
5. Cloud Function analyzes book and returns structured data

**Default Books Library:**
- File: [app.js:104-291](app.js#L104-L291)
- 200 curated famous books from past 30 years
- Includes Harry Potter, Hunger Games, Game of Thrones, etc.
- Random book pre-populated on page load ([app.js:1327](app.js#L1327))
- Function: `setRandomDefaultBook()` ([app.js:404-415](app.js#L404-L415))

**AI Analysis Returns:**
- Popularity description
- 2-sentence synopsis
- 4 main characters with descriptions
- Movie budget ($1M-$300M range)
- Casting budget (20-30% of movie budget)
- Studio name (Warner Bros, A24, etc.)
- Budget reasoning (4-6 sentences)

### 4.2 Budget Calculation System

**Dynamic AI-Powered Budgets** (implemented Nov 12, 2024)
- Replaced hardcoded 3-tier system
- Gemini AI calculates realistic budgets
- Range: $1M - $300M
- Casting budget: 20-30% of movie budget

**Budget Display:**
- File: [index.html:93-100](index.html#L93-L100)
- Screen 2 shows movie budget and casting budget
- Formatted with `formatCurrency()` ([app.js:394-397](app.js#L394-L397))

**Budget Tracking:**
- File: [app.js:1040-1055](app.js#L1040-L1055)
- `updateSpentBudget()` calculates total spent on cast
- Visual indicator: turns red if over budget (.budget-over class)
- Does not prevent casting if over budget (player choice)

### 4.3 Actor Search and Casting System

**Cache-First Architecture:**

1. **Frontend Cache Check** ([app.js:497-529](app.js#L497-L529))
   - Normalizes actor name (lowercase, trim)
   - Checks Firestore: `/artifacts/{appId}/public/data/actorCache/{normalizedName}`
   - 30-day TTL (Time To Live)
   - If cache hit: return immediately
   - If cache miss/expired: proceed to API call

2. **Backend Cache Check** ([functions/index.js:231-263](functions/index.js#L231-L263))
   - Redundancy layer in Cloud Function
   - Same 30-day TTL logic
   - Falls back to Gemini API if needed

3. **Gemini API Call** ([functions/index.js:266-280](functions/index.js#L266-L280))
   - Estimates per-movie fee and popularity
   - Response schema:
     ```javascript
     {
       fee: NUMBER,           // Dollar amount
       popularity: STRING     // "A-List", "Working Actor", etc.
     }
     ```

4. **Cache Write** (both frontend and backend)
   - Stores result in Firestore with serverTimestamp
   - Immutable entries (no updates/deletes)
   - Benefits all users (shared cache)

**Casting Interface:**
- File: [app.js:845-1055](app.js#L845-L1055)
- `populateScreen3()` creates character cards dynamically
- Each character has actor input, CAST button, No-Name checkbox

**Casting Actions:**

1. **Cast Named Actor** ([app.js:913-969](app.js#L913-L969))
   - Validates actor name entered
   - Shows loading overlay
   - Calls `callGetActorFee(actorName)`
   - Enforces minimum fee: $50,000
   - Updates state.castList[index]

2. **Cast No-Name Actor** ([app.js:977-996](app.js#L977-L996))
   - Fixed fee: $100,000
   - No API call needed
   - Actor name: "Unknown Actor (Character Name)"
   - Popularity: "No-Name"

3. **Recast** ([app.js:1030-1033](app.js#L1030-L1033))
   - Clears cast info
   - Re-enables input/button
   - Removes from state.castList

### 4.4 Movie Generation/Results System

**Entry Point:** Screen 3 → MAKE THE MOVIE! button
**File:** [app.js:1212-1257](app.js#L1212-L1257)

**Pre-flight Validation:**
- All 4 roles must be cast ([app.js:1214](app.js#L1214))
- Shows error modal if incomplete

**API Call:**
- Function: `callGenerateMovieResults(movieData)` ([app.js:571-584](app.js#L571-L584))
- Sends to Cloud Function:
  - bookName, bookPopularity
  - movieBudget, castingBudget, spentBudget
  - wentOverBudget (boolean)
  - castDetails (formatted string with all actors)

**AI Processing** ([functions/index.js:340-422](functions/index.js#L340-L422))
- System prompt: "You are a fun, snarky 90s movie critic"
- Response schema:
  ```javascript
  {
    boxOffice: NUMBER,          // Total revenue
    awards: ARRAY<STRING>,      // List of awards won
    summary: STRING             // 1-2 paragraph review
  }
  ```
- Timeout: 120 seconds (longer for AI processing)

**Results Display:**
- File: [app.js:1063-1096](app.js#L1063-L1096) (`populateScreen4()`)
- Shows project title, budget, box office, cast, awards, summary

**Data Persistence:**
- Saves to Firestore in background (non-blocking)
- Function: `saveMovieToFirebase()` ([app.js:656-686](app.js#L656-L686))
- Collection: `/artifacts/{appId}/public/data/movies`
- Auto-refreshes recent movies list

---

## 5. Cloud Functions

### 5.1 Function Overview

**Deployment Configuration:**
- File: [functions/package.json](functions/package.json)
- Node.js version: 20
- Firebase Functions: v5.0.0
- Firebase Admin: v12.1.0

**Secret Management:**
- Gemini API key stored in Google Secret Manager
- Command: `firebase functions:secrets:set GEMINI_API_KEY`
- Never exposed to frontend or logs

### 5.2 getBookInfo

**Purpose:** Analyze a book and return adaptation details

**Endpoint:**
- Production: `https://getbookinfo-t3itujxa3a-uc.a.run.app`
- Local: `http://127.0.0.1:5001/casting-director-1990/us-central1/getBookInfo`

**Method:** POST

**Request Body:**
```javascript
{
  bookName: STRING,
  author: STRING
}
```

**Response:**
```javascript
{
  popularity: STRING,         // "Massive Bestseller", "Cult Classic", etc.
  synopsis: STRING,           // 2-sentence summary
  characters: ARRAY<{         // 4 main characters
    name: STRING,
    description: STRING       // 1-2 sentences with age, traits
  }>,
  movieBudget: NUMBER,        // $1M - $300M
  castingBudget: NUMBER,      // 20-30% of movie budget
  studio: STRING,             // Real studio name
  budgetReasoning: STRING     // 4-6 sentences
}
```

**Implementation:** [functions/index.js:106-212](functions/index.js#L106-L212)

### 5.3 getActorFee

**Purpose:** Estimate actor's per-movie fee with caching

**Endpoint:**
- Production: `https://getactorfee-t3itujxa3a-uc.a.run.app`
- Local: `http://127.0.0.1:5001/casting-director-1990/us-central1/getActorFee`

**Method:** POST

**Request Body:**
```javascript
{
  actorName: STRING
}
```

**Response:**
```javascript
{
  fee: NUMBER,                // Dollar amount
  popularity: STRING          // "A-List", "Working Actor", etc.
}
```

**Implementation:** [functions/index.js:307-334](functions/index.js#L307-L334)
- Calls `getActorDataWithCache()` helper ([functions/index.js:231-297](functions/index.js#L231-L297))
- Cache-first approach (30-day TTL)

### 5.4 generateMovieResults

**Purpose:** Generate box office results, awards, and summary

**Endpoint:**
- Production: `https://generatemovieresults-t3itujxa3a-uc.a.run.app`
- Local: `http://127.0.0.1:5001/casting-director-1990/us-central1/generateMovieResults`

**Method:** POST
**Timeout:** 120 seconds (extended for AI processing)

**Request Body:**
```javascript
{
  bookName: STRING,
  bookPopularity: STRING,
  movieBudget: STRING,        // Formatted: "$X,XXX,XXX"
  castingBudget: STRING,
  spentBudget: STRING,
  wentOverBudget: BOOLEAN,
  castDetails: STRING         // Formatted list of actors
}
```

**Response:**
```javascript
{
  boxOffice: NUMBER,          // Total revenue
  awards: ARRAY<STRING>,      // Awards won/lost
  summary: STRING             // 1-2 paragraph review
}
```

**Implementation:** [functions/index.js:340-422](functions/index.js#L340-L422)

### 5.5 Shared Helper: callGeminiAPI

**Purpose:** Wrapper for Gemini API with retry logic

**Implementation:** [functions/index.js:22-100](functions/index.js#L22-L100)

**Features:**
- Exponential backoff with jitter
- Max 6 retry attempts
- Special handling for 503 errors
- Non-retryable 4xx errors (except 429)
- Network error handling

**Retry Logic:**
- Base delay: 2s (3s for 503 errors)
- Exponential: delay * 2^attempt
- Jitter: random 0-1000ms added
- Example delays: 2s → 4s → 8s → 16s → 32s → 64s

---

## 6. Data Models

### 6.1 State Shape (Frontend)

**Global State Object** ([app.js:310-318](app.js#L310-L318))
```javascript
const state = {
  bookName: "",           // Title of book being adapted
  author: "",             // Author of book
  bookInfo: null,         // Full API response from getBookInfo
  movieBudget: 0,         // Total production budget
  castingBudget: 0,       // Budget allocated for actors
  spentBudget: 0,         // Amount spent on cast so far
  castList: []            // Array of cast objects (length = 4)
}
```

**castList Array** (4 elements):
```javascript
[
  {
    character: "Harry Potter",      // From bookInfo.characters
    actor: "Daniel Radcliffe",      // User input or "Unknown Actor"
    fee: 5000000,                   // From API or $100k for no-name
    popularity: "A-List Star"       // From API or "No-Name"
  },
  // ... 3 more cast objects
]
```

### 6.2 Firebase Data Schema

**Movies Collection:**
```
/artifacts/{appId}/public/data/movies/{movieId}
```

Document Structure:
```javascript
{
  directorId: "abc123xyz789...",              // Firebase user UID
  bookName: "Harry Potter and the...",
  author: "J.K. Rowling",
  bookPopularity: "Massive Bestseller",
  movieBudget: 180000000,
  castList: [                                 // Complete array of 4 cast objects
    {
      character: "Harry Potter",
      actor: "Daniel Radcliffe",
      fee: 5000000,
      popularity: "A-List Star"
    },
    // ... 3 more
  ],
  boxOffice: 950000000,                       // AI-generated result
  awards: [                                   // AI-generated awards
    "Best Visual Effects (Oscar)",
    "Best Production Design (Oscar)"
  ],
  summary: "A magical journey...",            // AI-generated
  createdAt: "2025-11-13T22:30:00.000Z"      // ISO 8601 timestamp
}
```

**Actor Cache Collection:**
```
/artifacts/{appId}/public/data/actorCache/{normalizedActorName}
```

Document Structure:
```javascript
{
  actorName: "Daniel Radcliffe",    // Original name (proper casing)
  fee: 5000000,
  popularity: "A-List Star",
  cachedAt: Timestamp,              // Firestore server timestamp
  source: "gemini-api"
}
```

**TTL:** 30 days (enforced in application logic, not Firestore)

---

## 7. Key Features

### 7.1 Authentication/User System

**Anonymous Authentication:**
- File: [app.js:597-648](app.js#L597-L648)
- Provider: Firebase Anonymous Auth
- No user input required
- Each user gets unique Firebase UID
- Persists across browser sessions

**Initialization Flow** ([app.js:597-628](app.js#L597-L628)):
1. Initialize Firebase app
2. Set up auth listener (`onAuthStateChanged`)
3. Wait for existing auth or trigger sign-in
4. Display truncated user ID in header
5. Load recent movies once authenticated

**User ID Display:**
- Header shows: "Director ID: abc123..."
- First 8 characters of Firebase UID

### 7.2 Movie History/Recent Movies

**Recent Movies List:**
- Location: Screen 1 ([index.html:50-58](index.html#L50-L58))
- Shows 10 most recent movies from all users
- Auto-loads on Firebase auth ([app.js:614](app.js#L614))

**Load Function** ([app.js:692-720](app.js#L692-L720)):
- Query: `orderBy('createdAt', 'desc').limit(10)`
- Displays: book title, author, director ID, box office
- Clickable entries → shows movie details (Screen 5)

**Movie Details View** ([app.js:745-821](app.js#L745-L821)):
- Fetches full movie document from Firestore
- Shows complete cast, budget, box office, awards, summary
- Deep linking support with URL query parameter
- Example URL: `?movieId=abc123`

### 7.3 Welcome Screen

**First-Visit Experience:**
- File: [index.html:210-253](index.html#L210-L253)
- CSS: [welcome-screen.css](css/welcome-screen.css) (156 lines)
- Shows only on first visit (checked via localStorage)

**Content:**
- Cover image: casting_director_cover.png
- System date: "January 15, 1995" (retro theme)
- Mission statement and game objective
- Typed text animation on "Welcome, Director."
- Pulsing "BOOT SYSTEM" button

**Dismissal** ([app.js:439-448](app.js#L439-L448)):
- Click boot button OR press Enter key
- Sets localStorage flag: `hasSeenWelcome = true`
- Never shows again unless localStorage cleared

### 7.4 Version Display System

**Auto-Generated Versioning:**
- Files: [generate-version.js](generate-version.js) (95 lines), [version.js](version.js)
- Triggered: `npm run version` (before deployment)

**Generation Script:**
- Extracts git information (hash, branch, date, tag, message)
- Creates version.js module with exports

**Version Display:**
- Location: Bottom-right corner of screen
- CSS: [base.css:64-85](css/base.css#L64-L85)
- Format: "v94c97e9 (main)"
- Semi-transparent, increases opacity on hover

---

## 8. UI/UX System

### 8.1 DOS Aesthetic Implementation

**Color Palette** ([base.css:3-12](css/base.css#L3-L12))
```css
--dos-bg: #000080;         /* Classic Blue */
--dos-window-bg: #0000AA;  /* Darker blue for windows */
--dos-text: #FFFFFF;       /* White text */
--dos-header: #00FFFF;     /* Cyan for headers */
--dos-border: #C0C0C0;     /* Light gray borders */
--dos-error: #FF0000;      /* Bright red for errors */
--dos-green: #00FF00;      /* Bright green for success */
--dos-gray: #808080;       /* Medium gray */
```

**Typography:**
- Font: 'VT323' (Google Fonts, pixel/monospace font)
- Base size: 20px
- Header size: 24px
- Maintains authentic DOS terminal feel

**Window Chrome:**
- 2px outset borders (3D raised effect)
- Box shadows: `5px 5px 0px 0px rgba(0,0,0,0.5)`
- Fieldset borders with colored legends

### 8.2 Styling Approach

**Modular CSS Architecture:**

1. **[base.css](css/base.css)** (86 lines)
   - CSS variables
   - Body and container layout
   - Header styling
   - Screen management

2. **[forms.css](css/forms.css)** (38 lines)
   - Input field styles
   - Button styles
   - Checkbox styles

3. **[components.css](css/components.css)** (135 lines)
   - Character cards
   - Cast info displays
   - Budget displays
   - Loading overlay
   - Custom modal dialog

4. **Screen-specific CSS:**
   - [screen1.css](css/screen1.css): Recent movies list
   - [screen1_5-loading.css](css/screen1_5-loading.css): Loading bar
   - [screen2.css](css/screen2.css): Budget reveal
   - [welcome-screen.css](css/welcome-screen.css): First-visit experience

### 8.3 Animations and Transitions

**Welcome Screen Animations:**
1. Fade in (1s)
2. Slide in from bottom (0.8s with 0.5s delay)
3. Blinking cursor on typed text
4. Button pulse effect

**Loading Animations:**
1. Cursor blink (1s step-end infinite)
2. Loading dots ('.', '..', '...')
3. Progress bar stripes (diagonal movement)

---

## 9. Testing

### 9.1 Test Framework

**Playwright Configuration:**
- File: [playwright.config.js](playwright.config.js) (59 lines)
- Test directory: ./tests
- Timeout: 60 seconds per test
- Workers: 1 (sequential)
- Retries: 2 on CI, 0 locally

**Base URL:**
- Default: http://localhost:5002 (Firebase Hosting port)
- Environment variable override: process.env.BASE_URL

**Browsers:**
- Chromium only (Desktop Chrome device)
- Can add Firefox, WebKit in projects array

### 9.2 Test Suite Coverage

**File:** [tests/casting-flow.spec.js](tests/casting-flow.spec.js) (433 lines)

**Test Groups:**

1. **Main Flow** (8 tests, lines 8-230)
   - Homepage loads
   - Random default book
   - Director ID display
   - Navigation through screens
   - Validation

2. **Recent Movies** (2 tests, lines 232-277)
   - List visibility
   - Refresh functionality

3. **Error Handling** (1 test, lines 279-314)
   - API errors handled gracefully

4. **Welcome Screen** (4 tests, lines 316-432)
   - First visit display
   - Dismissal methods
   - Subsequent visit behavior

**Test Commands:**
```bash
npm test                  # Run all tests (headless, with emulator)
npm run test:manual       # Run without emulator (production)
npm run test:headed       # Show browser during tests
npm run test:ui           # Open Playwright UI mode
npm run test:debug        # Step-by-step debugging
npm run test:report       # View HTML report
```

### 9.3 Cloud Functions Testing

**File:** [functions/index.test.js](functions/index.test.js) (16,065 lines)
- Jest test framework
- Comprehensive unit tests
- Tests caching logic, API calls, error handling
- Run with: `npm test` in functions directory

---

## 10. Deployment

### 10.1 Deployment Workflow

**Prerequisites:**
1. Firebase Blaze Plan (pay-as-you-go)
2. Gemini API key
3. Firebase CLI installed

**Step-by-Step Process:**

1. **Set Gemini API Key** (one-time)
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```

2. **Generate Version File**
   ```bash
   npm run version
   ```

3. **Deploy Cloud Functions**
   ```bash
   firebase deploy --only functions
   ```

4. **Deploy Hosting**
   ```bash
   firebase deploy --only hosting
   ```

### 10.2 Environment Detection

**Automatic URL Selection** ([app.js:74-85](app.js#L74-L85)):
- Checks `window.location.hostname`
- localhost → emulator URLs
- production → Cloud Run URLs

### 10.3 Local Development

**Option 1: Firebase Emulators** (recommended)
```bash
npm run emulators          # Start hosting + functions
```
- Hosting: http://localhost:5002
- Functions: http://localhost:5001
- Firestore: http://localhost:8080 (UI)

**Option 2: Local File + Production Functions**
- Open index.html in browser
- Calls production Cloud Functions
- Uses production Firestore

**Testing with Emulators:**
```bash
npm test                   # Runs Playwright against emulators
```

### 10.4 Cost Breakdown

**Firebase (Blaze Plan):**
- Cloud Functions: Free tier 2M invocations/month
- Hosting: Free tier 10GB storage, 360MB/day transfer
- Firestore: Free tier 50K reads, 20K writes per day

**Gemini API:**
- gemini-2.5-flash: Free or very low cost
- Typical movie creation: 1-3 API calls

**Example Costs:**
- 1,000 movies/month: FREE
- 10,000 movies/month: ~$0-5

---

## Quick Reference

### File Locations

**Core Application:**
- Main HTML: [/index.html](index.html) (275 lines)
- Main JS: [/app.js](app.js) (1,342 lines)
- Cloud Functions: [/functions/index.js](functions/index.js) (423 lines)

**Styling:**
- Base: [/css/base.css](css/base.css)
- Forms: [/css/forms.css](css/forms.css)
- Components: [/css/components.css](css/components.css)
- Screens: [/css/screen*.css](css/)
- Welcome: [/css/welcome-screen.css](css/welcome-screen.css)

**Configuration:**
- Firebase: [/firebase.json](firebase.json)
- Firestore Rules: [/firestore.rules](firestore.rules)
- Package: [/package.json](package.json)
- Functions Package: [/functions/package.json](functions/package.json)
- Playwright: [/playwright.config.js](playwright.config.js)

### Key Functions Reference

**Navigation:**
- `showScreen(screenId)` - [app.js:349](app.js#L349)
- `showLoading(show)` - [app.js:362](app.js#L362)
- `showModal(message, title, isError)` - [app.js:374](app.js#L374)

**Data Fetching:**
- `callGetBookInfo(bookName, author)` - [app.js:464](app.js#L464)
- `callGetActorFee(actorName)` - [app.js:497](app.js#L497)
- `callGenerateMovieResults(movieData)` - [app.js:571](app.js#L571)

**Firebase:**
- `initFirebase()` - [app.js:597](app.js#L597)
- `saveMovieToFirebase(results)` - [app.js:656](app.js#L656)
- `loadRecentMovies()` - [app.js:692](app.js#L692)
- `showMovieDetails(movieId)` - [app.js:745](app.js#L745)

**Game Logic:**
- `populateScreen2()` - [app.js:832](app.js#L832)
- `populateScreen3()` - [app.js:845](app.js#L845)
- `handleCastActor(event)` - [app.js:913](app.js#L913)
- `castNoNameActor(index)` - [app.js:977](app.js#L977)
- `updateSpentBudget()` - [app.js:1040](app.js#L1040)
- `populateScreen4(results)` - [app.js:1063](app.js#L1063)

### Screen IDs and Elements

**Screen IDs:**
- screen1: Book entry & recent movies
- screen1_5: Incoming offer (loading)
- screen2: Budget reveal
- screen3: Casting interface
- screen4: Box office results
- screen5: Movie details

**Important Element IDs:**
- #book-name, #author-name: Input fields
- #submit-book: Load project button
- #recent-movies-list: Recent movies list
- #refresh-movies: Refresh button
- #go-to-casting: Navigate to casting
- #character-list: Casting cards container
- #make-movie: Generate results button
- #welcome-screen: First-visit overlay
- #loading-overlay: Full-screen loading
- #dos-modal: Custom modal dialog

### State Properties

- **state.bookName** - Current book title
- **state.author** - Current book author
- **state.bookInfo** - Full API response
- **state.movieBudget** - Total production budget
- **state.castingBudget** - Budget allocated for cast
- **state.spentBudget** - Current spend on cast
- **state.castList** - Array of 4 cast objects

### CSS Classes

- **.screen** - Base screen class (hidden by default)
- **.active** - Makes screen visible
- **.cast-info** - Cyan colored info text
- **.budget-display** - Large budget text
- **.budget-over** - Red text for over budget
- **.character-card** - Character casting card
- **.recast-button** - Red [X] button
- **.dos-modal** - Custom modal dialog
- **.loading-overlay** - Full-screen loading
- **.welcome-screen** - First-visit overlay

### npm Scripts

**Root Package:**
- `npm run version` - Generate version.js
- `npm run emulators` - Start Firebase emulators
- `npm test` - Run e2e tests with emulator
- `npm run test:headed` - Run tests with visible browser
- `npm run test:ui` - Open Playwright UI
- `npm run test:debug` - Debug tests step-by-step
- `npm run test:report` - View HTML test report

**Functions Package** (cd functions/):
- `npm test` - Run Jest unit tests
- `npm run deploy` - Deploy functions only

---

**End of Technical Architecture Documentation**

*This documentation covers the complete Casting Director game codebase as of November 13, 2025 (commit 94c97e9).*
