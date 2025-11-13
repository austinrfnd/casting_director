# Leaderboard Feature Requirements

## Overview
Add a competitive leaderboard system to the Casting Director game that showcases top-performing movies across different metrics and time periods, maintaining the retro DOS aesthetic.

## Feature Objectives
- Provide recognition for successful casting/movie decisions
- Encourage replayability and competition among players
- Display transparent performance metrics (box office and profitability)
- Maintain the authentic 90s DOS interface aesthetic

## Core Requirements

### 1. Award Categories

#### A. Highest Box Office
- Display top 10 movies by total box office revenue
- Sort descending by `boxOffice` field
- Show exact dollar amounts

#### B. Largest Profit
- Display top 10 movies by net profit
- Calculation: `profit = boxOffice - movieBudget`
- Sort descending by calculated profit value
- Show exact dollar amounts for profit (not box office)

### 2. Time Range Filters

#### A. Last 30 Days (DEFAULT)
- Filter movies where `createdAt >= (today - 30 days)`
- Display only movies created in the last 30 calendar days
- Update dynamically based on current date

#### B. All Time
- Display all movies regardless of creation date
- No date filtering applied

### 3. User Interface

#### Layout
- Add leaderboard section to **Screen 1** (home screen)
- Position: Below or replacing the "Recently Cast Movies" section
- Use standard DOS fieldset with `<legend>LEADERBOARDS</legend>`

#### Toggle Controls
```
[HIGHEST BOX OFFICE*] [LARGEST PROFIT]
[LAST 30 DAYS*] [ALL TIME]
```
- Two button groups for category and time range
- Active button highlighted with green background (`.toggle-active`)
- Inset border style for active, outset for inactive
- Default selections marked with * above

#### Leaderboard Display
```
#1  BOOK TITLE by Author Name
    Box Office: $150,000,000 | Director: abc123...

#2  ANOTHER BOOK by Another Author
    Box Office: $125,000,000 | Director: xyz789...
```

**Display Format:**
- Rank number (#1-#10) in cyan color
- Book title in **bold**
- Author name
- Metric amount (box office or profit)
- Shortened director ID (first 8 chars)
- Scrollable container (150px height max)
- Clickable entries (show full movie details)

#### Interactive Elements
- Each leaderboard entry clickable → shows movie details modal
- REFRESH button to reload data
- Smooth toggle transitions
- Hover effects on list items

### 4. Empty States

Handle scenarios with no data:
- No movies in last 30 days: "No movies cast in the last 30 days. Be the first!"
- No movies at all: "No movies have been cast yet. Start your first project!"

## Technical Implementation

### Data Source
**Firestore Collection:** `/artifacts/${appId}/public/data/movies`

**Required Fields:**
```javascript
{
    boxOffice: Number,        // Total revenue
    movieBudget: Number,      // Total budget
    createdAt: String,        // ISO date string
    bookName: String,         // For display
    author: String,           // For display
    directorId: String,       // For attribution
    id: String                // Document ID for details link
}
```

### Query Strategies

#### Highest Box Office
```javascript
// Firestore query
const q = query(
    moviesCollection,
    orderBy('boxOffice', 'desc'),
    limit(10)
);
```

#### Largest Profit
**Challenge:** Firestore cannot query computed fields

**Solution:** Client-side calculation
1. Fetch all movies (with date filter if applicable)
2. Calculate `profit = boxOffice - movieBudget` for each
3. Sort by profit descending in JavaScript
4. Slice top 10 results

#### Date Filtering (Last 30 Days)
```javascript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const q = query(
    moviesCollection,
    where('createdAt', '>=', thirtyDaysAgo.toISOString()),
    orderBy('createdAt', 'desc')
);
```

### State Management

```javascript
const leaderboardState = {
    mode: 'boxOffice',      // 'boxOffice' | 'profit'
    timeRange: 'last30days' // 'last30days' | 'allTime'
};
```

### Functions to Implement

#### `loadLeaderboard()`
- Queries Firestore based on current state
- Handles date filtering
- Calculates profit if needed
- Returns top 10 movies

#### `displayLeaderboard(movies)`
- Renders HTML list with rankings
- Formats dollar amounts
- Adds click event listeners
- Handles empty states

#### `updateLeaderboardToggle(type, value)`
- Updates state object
- Updates button active states (CSS classes)
- Reloads leaderboard data

### Files to Modify

1. **index.html** (lines ~50-58)
   - Add leaderboard fieldset with toggle buttons
   - Add `<ul id="leaderboard-list"></ul>`
   - Link new CSS file

2. **app.js** (functions to add)
   - `leaderboardState` object (~line 30)
   - `loadLeaderboard()` function (~line 700)
   - `displayLeaderboard(movies)` function (~line 735)
   - Event listeners for toggles (~line 1175)
   - Call `loadLeaderboard()` in Firebase auth callback

3. **css/leaderboard.css** (NEW FILE)
   - `.toggle-active` class (green bg, inset border)
   - `#leaderboard-list` styles (match recent movies)
   - Rank number styling (cyan color)
   - Button bar layout

4. **index.html** (head section)
   - Add `<link rel="stylesheet" href="css/leaderboard.css">`

## Visual Design Specifications

### Color Palette
- Background: `#0000AA` (DOS window blue)
- Text: `#FFFFFF` (white)
- Highlights: `#00FFFF` (cyan) - rank numbers, book titles
- Active toggle: `#00FF00` (green background)
- Borders: `#C0C0C0` (light gray)

### Typography
- Font: `VT323` (Google Fonts monospace)
- Size: `16px` base, `20px` for titles

### Borders & Spacing
- Fieldset border: `2px inset #C0C0C0`
- Button borders: `2px outset #C0C0C0` (inactive), `2px inset #C0C0C0` (active)
- List item padding: `8px`
- Button padding: `8px 16px`

## Performance Considerations

1. **Profit Calculation:**
   - May require fetching 20-50 movies to find top 10
   - Calculate client-side to avoid complex queries
   - Consider caching results briefly

2. **Date Filtering:**
   - Create compound index in Firestore: `createdAt DESC, boxOffice DESC`
   - Reduces query cost for 30-day views

3. **Real-time Updates:**
   - Manual refresh only (no live listeners)
   - Reduces Firebase read costs
   - User-initiated refresh provides control

## Testing Checklist

### Functional Tests
- [ ] Default view shows "Last 30 Days" + "Highest Box Office"
- [ ] Toggling to "Largest Profit" shows different rankings
- [ ] Toggling to "All Time" includes older movies
- [ ] Profit calculations are accurate (boxOffice - movieBudget)
- [ ] Top 10 limit enforced correctly
- [ ] Rankings numbered 1-10 correctly
- [ ] Dollar amounts formatted with commas and currency symbol
- [ ] Clicking entry shows movie details modal
- [ ] Refresh button reloads current view
- [ ] Empty states display appropriate messages

### Visual Tests
- [ ] Maintains DOS aesthetic (colors, fonts, borders)
- [ ] Active toggle buttons highlighted green
- [ ] Scrollbar appears when list exceeds 150px
- [ ] Hover effects work on list items
- [ ] Responsive on mobile devices
- [ ] Cyan highlights visible on rank numbers
- [ ] Buttons aligned properly

### Edge Cases
- [ ] No movies in database
- [ ] No movies in last 30 days
- [ ] Movies with negative profit display correctly
- [ ] Movies with $0 box office handled
- [ ] Very long book titles truncated/wrapped
- [ ] Firestore query errors handled gracefully

## Future Enhancements

### Phase 2 Ideas
- Additional categories:
  - "Most Awards Won"
  - "Best Budget Efficiency" (profit/budget ratio)
  - "Critics' Darlings" (award count)
- Filtering by genre/book type
- Personal best stats per director
- Monthly/weekly leaderboard resets
- Share leaderboard position to social media
- Animation for rank changes
- Trophy/badge icons for #1 positions

### Performance Optimizations
- Cache leaderboard results in localStorage (5-minute TTL)
- Pagination for longer lists
- Lazy load movie details on click
- Pre-compute profit server-side (Cloud Function scheduled job)

## Success Metrics

- Increased session time (users checking leaderboard)
- Higher return rate (users coming back to check rankings)
- More movies created (competition drives engagement)
- User feedback on competitive feature

## References

- Existing implementation: `loadRecentMovies()` in [app.js](../app.js:686-714)
- Display pattern: `displayRecentMovies()` in [app.js](../app.js:720-732)
- Styling reference: [css/screen1.css](../css/screen1.css) (recent movies list)
- Data structure: [README.md](../README.md:19-22) (Firebase Integration section)
