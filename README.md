# Casting Director C:>

A retro 90s DOS-style game where you play as a Hollywood casting director. Your mission: adapt best-selling books for the big screen and see if your casting choices lead to box office gold or critical disaster!

## About The Game

This app lets you and your friends (or book club!) step into the shoes of a movie executive. You'll be given a book, a budget, and a list of characters. It's your job to cast the movie, manage your budget, and then "MAKE THE MOVIE!" to see a fun, AI-generated summary of how your film performed.

## Features

**Retro DOS Aesthetic:** A fun, pixelated UI straight from the early 90s.

**AI-Powered:** Uses Google's Gemini AI to:
- Analyze real books and authors.
- Generate movie budgets based on the book's popularity.
- Fetch "realistic" (and sometimes hilarious) actor fees.
- Hypothesize your movie's box office and awards results.

**Firebase Integration:**
- Saves all final movie results to a public Firestore database.
- Displays a real-time list of "Recently Cast Movies" from all players.
- Uses anonymous authentication to give each player a unique "Director ID".

## How to Play

1. **Start a Project:** Enter a real book title and author. The AI will analyze it and give you a budget.

2. **Get to Casting:** On the casting screen, you'll see the main characters and their descriptions.

3. **Cast Your Actors:** For each character, you can either:
   - Type in a real actor's name and hit "CAST" to get their AI-generated fee.
   - Check the "No-Name" box for a flat $100,000 fee.
   - "Fire" an actor by hitting the [X] button if they're too expensive.

4. **Make the Movie!:** Once all roles are cast, hit the big button to see your results! Your movie's performance will be saved and shared with other players.

## Planned Feature Enhancements

1. **Actor Data Caching in Firebase:** Implement a caching layer for actor lookups to improve performance and reduce API costs. When a user enters an actor name:
   - Check Firebase first for cached actor data (fee and popularity)
   - If found, return cached data immediately
   - If not found, call Gemini API to fetch actor information
   - Cache the Gemini API response in Firebase for future lookups
   - Benefits: faster response times, reduced Gemini API calls, shared cache across all users

2. **Casting Grade & Perfect Match Suggestions:** Add AI-powered feedback on casting choices after "Make the Movie" is clicked. For each role (including no-name actors):
   - Assign a casting grade from 0-100 based on how well the actor fits the character description, their acting range, age appropriateness, and star power relative to the book's popularity
   - Display a "Perfect Cast" section showing 2-3 actors who would have been a 100/100 for each role
   - Provide justification for why each suggested actor would be perfect (e.g., "Daniel Day-Lewis - Perfect age range, method actor known for dramatic roles, Oscar-winning gravitas matches the character's complexity")
   - Benefits: educational feedback, inspiration for future casting, fun "what if" scenarios, deeper engagement with the game

## Running Tests

The project includes an end-to-end (e2e) test suite using Playwright to verify the complete user flow.

### Prerequisites

```bash
npm install
```

### Test Commands

- **Run all tests (headless):**
  ```bash
  npm test
  ```

- **Run tests with browser visible:**
  ```bash
  npm run test:headed
  ```

- **Open Playwright UI for interactive testing:**
  ```bash
  npm run test:ui
  ```

- **Debug tests step-by-step:**
  ```bash
  npm run test:debug
  ```

- **View test report:**
  ```bash
  npm run test:report
  ```

### Test Coverage

The e2e test suite covers:
- Homepage loading and Firebase authentication
- Book entry form validation
- Navigation from Screen 1 (book entry) to Screen 2 (budget reveal)
- Navigation to Screen 3 (casting screen)
- Recent movies display and refresh functionality
- Error handling and API error scenarios

## Setup for Deployment

To host this game on your own Firebase account, you only need to edit one file (casting_director_95.html) to add your API keys.

### Create a Firebase Project:

- Go to the Firebase Console and create a new project.
- Enable Firestore (start in test mode) and Authentication (enable "Anonymous" sign-in).
- Go to Hosting and set it up.

### Get Your Firebase Config:

- In your Firebase project, go to Project Settings > General.
- Scroll down to "Your apps" and create a Web app (if you haven't already).
- Firebase will give you a firebaseConfig object. Copy this.

### Get Your Gemini API Key:

- Go to Google AI Studio.
- Create a new API key. Copy this key.

### Paste Keys into the HTML File:

- Open casting_director_95.html.
- Find the const firebaseConfig section (around line 345) and paste your Firebase config object.
- Find the async function makeApiCall (around line 430) and paste your Gemini API key into the const apiKey variable.

### Deploy:

- Install the Firebase CLI.
- Run firebase login.
- Run firebase init and connect it to your project (select Hosting).
- Place the casting_director_95.html file in your public folder (rename it to index.html).
- Run firebase deploy.

Your game is now live and ready to be shared!