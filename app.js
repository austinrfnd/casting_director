/**
 * CASTING DIRECTOR - Main Application Orchestrator
 *
 * A retro DOS-style movie casting game where players select actors for book adaptations
 * and see how well their movie performs at the box office.
 *
 * This is the main entry point that initializes and coordinates all modules.
 */

// ============================================================================
// MODULE IMPORTS
// ============================================================================

// Config
import { initConstants } from './js/config/constants.js';
import { setRandomDefaultBook } from './js/config/books.js';

// Services
import { initFirebase } from './js/services/firebaseService.js';

// UI Core
import { showScreen, showLoading } from './js/ui/screenManager.js';
import { initModal } from './js/ui/modalManager.js';
import { showWelcomeScreen, hideWelcomeScreen, initWelcomeScreen, clearIntroTimers } from './js/ui/welcomeScreen.js';

// Screens
import { initScreen1, refreshRecentMovies } from './js/ui/screen1.js';
import { initScreen2 } from './js/ui/screen2.js';
import { initScreen3 } from './js/ui/screen3.js';
import { initScreen4 } from './js/ui/screen4.js';

// Game Logic
import { showMovieDetails, initMovieDetails, checkDeepLink } from './js/game/movieDetails.js';

// Utils
import { displayVersion } from './js/utils/helpers.js';

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all event listeners for screens and UI components
 */
function initializeEventListeners() {
    initModal();
    initWelcomeScreen();
    initScreen1();
    initScreen2();
    initScreen3();
    initScreen4();
    initMovieDetails();
}

/**
 * Handle successful Firebase authentication
 * @param {object} user - Firebase user object
 */
async function onAuthSuccess(user) {
    console.log("Auth success, user:", user.uid);
    // Load recent movies after authentication
    await refreshRecentMovies();
}

/**
 * Application initialization
 * Runs when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM references
    initConstants();

    // Display version
    displayVersion();

    // Check for deep link to a specific movie
    const movieId = checkDeepLink();

    // Show welcome screen every time (unless deep linking to a movie)
    const showWelcome = !movieId;

    if (showWelcome) {
        showWelcomeScreen();
    } else {
        // If deep linking, skip welcome screen
        showLoading(true);
    }

    // Set a random book as default suggestion
    setRandomDefaultBook();

    // Initialize all event listeners
    initializeEventListeners();

    try {
        // Connect to Firebase and authenticate
        await initFirebase(onAuthSuccess);
    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }

    if (!showWelcome) {
        showLoading(false);
    }

    // If there's a movieId in the URL, load that movie directly
    if (movieId) {
        await showMovieDetails(movieId, false); // false = don't update URL again
    } else {
        showScreen('screen1'); // Start on the book entry screen
    }
});
