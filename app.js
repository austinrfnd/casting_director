/**
 * CASTING DIRECTOR - Main Application Script
 *
 * A retro DOS-style movie casting game where players select actors for book adaptations
 * and see how well their movie performs at the box office.
 *
 * Uses Google Gemini API for AI-powered book analysis, actor fee estimation, and results generation.
 * Uses Firebase for user authentication and storing/retrieving movie results.
 */

// ============================================================================
// FIREBASE SDK IMPORTS
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    getDoc,
    doc,
    setDoc,
    serverTimestamp,
    Timestamp,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ============================================================================
// VERSION IMPORT
// ============================================================================

import { getFullVersionInfo } from "./version.js";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Firebase Configuration
 * IMPORTANT: When deploying to your own Firebase project, replace this with your config
 * Get this from: Firebase Console > Project Settings > General > Your apps > Web app
 */
const firebaseConfig = {
    apiKey: "AIzaSyB2v8ieH-sQdcDrISnywTRZch1tGg83fxw",
    authDomain: "casting-director-1990.firebaseapp.com",
    projectId: "casting-director-1990",
    storageBucket: "casting-director-1990.firebasestorage.app",
    messagingSenderId: "302759264701",
    appId: "1:302759264701:web:50c2efdd2f84c7449f12d4",
    measurementId: "G-JZ6TNW3HX1"
};

/**
 * Cloud Functions Configuration
 * The Gemini API key is now stored securely in Firebase Cloud Functions
 * These URLs point to your deployed Cloud Functions (or local emulator for testing)
 *
 * For local development with emulator, use:
 * http://127.0.0.1:5001/casting-director-1990/us-central1/functionName
 *
 * For production, 2nd Gen Cloud Functions use Cloud Run URLs:
 * https://functionname-projecthash-uc.a.run.app
 */
const CLOUD_FUNCTIONS =
    window.location.hostname === 'localhost'
        ? {
            getBookInfo: 'http://127.0.0.1:5001/casting-director-1990/us-central1/getBookInfo',
            getActorFee: 'http://127.0.0.1:5001/casting-director-1990/us-central1/getActorFee',
            generateMovieResults: 'http://127.0.0.1:5001/casting-director-1990/us-central1/generateMovieResults'
          }
        : {
            getBookInfo: 'https://getbookinfo-t3itujxa3a-uc.a.run.app',
            getActorFee: 'https://getactorfee-t3itujxa3a-uc.a.run.app',
            generateMovieResults: 'https://generatemovieresults-t3itujxa3a-uc.a.run.app'
          };

/**
 * App ID for Firebase artifacts path
 * Uses hard-coded value if not defined elsewhere
 */
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

/**
 * Initial auth token (if using custom authentication)
 * Falls back to anonymous sign-in if not defined
 */
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// ============================================================================
// DEFAULT BOOKS LIBRARY
// Curated list of 200 famous books from the past 30 years
// ============================================================================

const FAMOUS_BOOKS = [
    { title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling" },
    { title: "Harry Potter and the Chamber of Secrets", author: "J.K. Rowling" },
    { title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling" },
    { title: "Harry Potter and the Goblet of Fire", author: "J.K. Rowling" },
    { title: "Harry Potter and the Order of the Phoenix", author: "J.K. Rowling" },
    { title: "Harry Potter and the Half-Blood Prince", author: "J.K. Rowling" },
    { title: "Harry Potter and the Deathly Hallows", author: "J.K. Rowling" },
    { title: "The Hunger Games", author: "Suzanne Collins" },
    { title: "Catching Fire", author: "Suzanne Collins" },
    { title: "Mockingjay", author: "Suzanne Collins" },
    { title: "The Da Vinci Code", author: "Dan Brown" },
    { title: "Angels & Demons", author: "Dan Brown" },
    { title: "Inferno", author: "Dan Brown" },
    { title: "The Kite Runner", author: "Khaled Hosseini" },
    { title: "A Thousand Splendid Suns", author: "Khaled Hosseini" },
    { title: "Life of Pi", author: "Yann Martel" },
    { title: "The Lovely Bones", author: "Alice Sebold" },
    { title: "The Help", author: "Kathryn Stockett" },
    { title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson" },
    { title: "The Girl Who Played with Fire", author: "Stieg Larsson" },
    { title: "The Girl Who Kicked the Hornet's Nest", author: "Stieg Larsson" },
    { title: "Gone Girl", author: "Gillian Flynn" },
    { title: "Sharp Objects", author: "Gillian Flynn" },
    { title: "The Fault in Our Stars", author: "John Green" },
    { title: "Looking for Alaska", author: "John Green" },
    { title: "Paper Towns", author: "John Green" },
    { title: "Twilight", author: "Stephenie Meyer" },
    { title: "New Moon", author: "Stephenie Meyer" },
    { title: "Eclipse", author: "Stephenie Meyer" },
    { title: "Breaking Dawn", author: "Stephenie Meyer" },
    { title: "The Road", author: "Cormac McCarthy" },
    { title: "No Country for Old Men", author: "Cormac McCarthy" },
    { title: "Atonement", author: "Ian McEwan" },
    { title: "Cloud Atlas", author: "David Mitchell" },
    { title: "The Book Thief", author: "Markus Zusak" },
    { title: "Water for Elephants", author: "Sara Gruen" },
    { title: "The Time Traveler's Wife", author: "Audrey Niffenegger" },
    { title: "The Secret Life of Bees", author: "Sue Monk Kidd" },
    { title: "Memoirs of a Geisha", author: "Arthur Golden" },
    { title: "American Gods", author: "Neil Gaiman" },
    { title: "Coraline", author: "Neil Gaiman" },
    { title: "The Ocean at the End of the Lane", author: "Neil Gaiman" },
    { title: "Good Omens", author: "Neil Gaiman and Terry Pratchett" },
    { title: "A Game of Thrones", author: "George R.R. Martin" },
    { title: "A Clash of Kings", author: "George R.R. Martin" },
    { title: "A Storm of Swords", author: "George R.R. Martin" },
    { title: "A Feast for Crows", author: "George R.R. Martin" },
    { title: "A Dance with Dragons", author: "George R.R. Martin" },
    { title: "The Martian", author: "Andy Weir" },
    { title: "Project Hail Mary", author: "Andy Weir" },
    { title: "Ready Player One", author: "Ernest Cline" },
    { title: "Ready Player Two", author: "Ernest Cline" },
    { title: "The Name of the Wind", author: "Patrick Rothfuss" },
    { title: "The Wise Man's Fear", author: "Patrick Rothfuss" },
    { title: "The Night Circus", author: "Erin Morgenstern" },
    { title: "The Goldfinch", author: "Donna Tartt" },
    { title: "The Secret History", author: "Donna Tartt" },
    { title: "All the Light We Cannot See", author: "Anthony Doerr" },
    { title: "The Light Between Oceans", author: "M.L. Stedman" },
    { title: "Room", author: "Emma Donoghue" },
    { title: "Big Little Lies", author: "Liane Moriarty" },
    { title: "The Husband's Secret", author: "Liane Moriarty" },
    { title: "Wild", author: "Cheryl Strayed" },
    { title: "Educated", author: "Tara Westover" },
    { title: "Becoming", author: "Michelle Obama" },
    { title: "The Glass Castle", author: "Jeannette Walls" },
    { title: "Unbroken", author: "Laura Hillenbrand" },
    { title: "The Immortal Life of Henrietta Lacks", author: "Rebecca Skloot" },
    { title: "Into the Wild", author: "Jon Krakauer" },
    { title: "Into Thin Air", author: "Jon Krakauer" },
    { title: "The Devil in the White City", author: "Erik Larson" },
    { title: "In Cold Blood", author: "Truman Capote" },
    { title: "Divergent", author: "Veronica Roth" },
    { title: "Insurgent", author: "Veronica Roth" },
    { title: "Allegiant", author: "Veronica Roth" },
    { title: "The Maze Runner", author: "James Dashner" },
    { title: "The Scorch Trials", author: "James Dashner" },
    { title: "The Death Cure", author: "James Dashner" },
    { title: "The Perks of Being a Wallflower", author: "Stephen Chbosky" },
    { title: "Thirteen Reasons Why", author: "Jay Asher" },
    { title: "Eleanor & Park", author: "Rainbow Rowell" },
    { title: "The 5th Wave", author: "Rick Yancey" },
    { title: "Miss Peregrine's Home for Peculiar Children", author: "Ransom Riggs" },
    { title: "Everything, Everything", author: "Nicola Yoon" },
    { title: "The Sun is Also a Star", author: "Nicola Yoon" },
    { title: "Me Before You", author: "Jojo Moyes" },
    { title: "Still Alice", author: "Lisa Genova" },
    { title: "The Notebook", author: "Nicholas Sparks" },
    { title: "A Walk to Remember", author: "Nicholas Sparks" },
    { title: "The Lucky One", author: "Nicholas Sparks" },
    { title: "Safe Haven", author: "Nicholas Sparks" },
    { title: "The Longest Ride", author: "Nicholas Sparks" },
    { title: "The Handmaid's Tale", author: "Margaret Atwood" },
    { title: "The Testaments", author: "Margaret Atwood" },
    { title: "Oryx and Crake", author: "Margaret Atwood" },
    { title: "The Poisonwood Bible", author: "Barbara Kingsolver" },
    { title: "Beloved", author: "Toni Morrison" },
    { title: "A Thousand Acres", author: "Jane Smiley" },
    { title: "The Amazing Adventures of Kavalier & Clay", author: "Michael Chabon" },
    { title: "The Corrections", author: "Jonathan Franzen" },
    { title: "Freedom", author: "Jonathan Franzen" },
    { title: "Middlesex", author: "Jeffrey Eugenides" },
    { title: "The Virgin Suicides", author: "Jeffrey Eugenides" },
    { title: "White Teeth", author: "Zadie Smith" },
    { title: "The Namesake", author: "Jhumpa Lahiri" },
    { title: "Interpreter of Maladies", author: "Jhumpa Lahiri" },
    { title: "Bel Canto", author: "Ann Patchett" },
    { title: "The Poisonwood Bible", author: "Barbara Kingsolver" },
    { title: "Snow Falling on Cedars", author: "David Guterson" },
    { title: "The Curious Incident of the Dog in the Night-Time", author: "Mark Haddon" },
    { title: "Never Let Me Go", author: "Kazuo Ishiguro" },
    { title: "The Remains of the Day", author: "Kazuo Ishiguro" },
    { title: "The Underground Railroad", author: "Colson Whitehead" },
    { title: "The Nickel Boys", author: "Colson Whitehead" },
    { title: "Homegoing", author: "Yaa Gyasi" },
    { title: "The Hate U Give", author: "Angie Thomas" },
    { title: "The Nightingale", author: "Kristin Hannah" },
    { title: "The Great Alone", author: "Kristin Hannah" },
    { title: "Where the Crawdads Sing", author: "Delia Owens" },
    { title: "Circe", author: "Madeline Miller" },
    { title: "The Song of Achilles", author: "Madeline Miller" },
    { title: "The Seven Husbands of Evelyn Hugo", author: "Taylor Jenkins Reid" },
    { title: "Daisy Jones & The Six", author: "Taylor Jenkins Reid" },
    { title: "Malibu Rising", author: "Taylor Jenkins Reid" },
    { title: "The Midnight Library", author: "Matt Haig" },
    { title: "Anxious People", author: "Fredrik Backman" },
    { title: "A Man Called Ove", author: "Fredrik Backman" },
    { title: "Beartown", author: "Fredrik Backman" },
    { title: "The Thursday Murder Club", author: "Richard Osman" },
    { title: "The Man Who Died Twice", author: "Richard Osman" },
    { title: "The Silent Patient", author: "Alex Michaelides" },
    { title: "The Maidens", author: "Alex Michaelides" },
    { title: "The Woman in the Window", author: "A.J. Finn" },
    { title: "The Guest List", author: "Lucy Foley" },
    { title: "The Hunting Party", author: "Lucy Foley" },
    { title: "Then She Was Gone", author: "Lisa Jewell" },
    { title: "The Family Upstairs", author: "Lisa Jewell" },
    { title: "Little Fires Everywhere", author: "Celeste Ng" },
    { title: "Everything I Never Told You", author: "Celeste Ng" },
    { title: "The Dutch House", author: "Ann Patchett" },
    { title: "Commonwealth", author: "Ann Patchett" },
    { title: "A Gentleman in Moscow", author: "Amor Towles" },
    { title: "Rules of Civility", author: "Amor Towles" },
    { title: "The Lincoln Highway", author: "Amor Towles" },
    { title: "The Invisible Life of Addie LaRue", author: "V.E. Schwab" },
    { title: "The Ten Thousand Doors of January", author: "Alix E. Harrow" },
    { title: "The Starless Sea", author: "Erin Morgenstern" },
    { title: "The Priory of the Orange Tree", author: "Samantha Shannon" },
    { title: "The Fifth Season", author: "N.K. Jemisin" },
    { title: "The Obelisk Gate", author: "N.K. Jemisin" },
    { title: "The Stone Sky", author: "N.K. Jemisin" },
    { title: "Children of Blood and Bone", author: "Tomi Adeyemi" },
    { title: "Children of Virtue and Vengeance", author: "Tomi Adeyemi" },
    { title: "An American Marriage", author: "Tayari Jones" },
    { title: "The Vanishing Half", author: "Brit Bennett" },
    { title: "Such a Fun Age", author: "Kiley Reid" },
    { title: "Pachinko", author: "Min Jin Lee" },
    { title: "The Overstory", author: "Richard Powers" },
    { title: "There There", author: "Tommy Orange" },
    { title: "The Water Dancer", author: "Ta-Nehisi Coates" },
    { title: "Between the World and Me", author: "Ta-Nehisi Coates" },
    { title: "Born a Crime", author: "Trevor Noah" },
    { title: "Sapiens", author: "Yuval Noah Harari" },
    { title: "Homo Deus", author: "Yuval Noah Harari" },
    { title: "21 Lessons for the 21st Century", author: "Yuval Noah Harari" },
    { title: "The Power of Habit", author: "Charles Duhigg" },
    { title: "Thinking, Fast and Slow", author: "Daniel Kahneman" },
    { title: "Quiet", author: "Susan Cain" },
    { title: "The Lean Startup", author: "Eric Ries" },
    { title: "The 4-Hour Workweek", author: "Timothy Ferriss" },
    { title: "Steve Jobs", author: "Walter Isaacson" },
    { title: "Shoe Dog", author: "Phil Knight" },
    { title: "When Breath Becomes Air", author: "Paul Kalanithi" },
    { title: "Being Mortal", author: "Atul Gawande" },
    { title: "The Sixth Extinction", author: "Elizabeth Kolbert" },
    { title: "Bad Blood", author: "John Carreyrou" },
    { title: "Hillbilly Elegy", author: "J.D. Vance" },
    { title: "Just Mercy", author: "Bryan Stevenson" },
    { title: "The New Jim Crow", author: "Michelle Alexander" },
    { title: "Evicted", author: "Matthew Desmond" },
    { title: "Nickel and Dimed", author: "Barbara Ehrenreich" },
    { title: "The Immortalists", author: "Chloe Benjamin" },
    { title: "The Mothers", author: "Brit Bennett" },
    { title: "Homegoing", author: "Yaa Gyasi" },
    { title: "Less", author: "Andrew Sean Greer" },
    { title: "The Sellout", author: "Paul Beatty" }
];

// ============================================================================
// GLOBAL STATE
// ============================================================================

/**
 * Firebase Globals
 * Initialized during Firebase setup
 */
let app;              // Firebase app instance
let db;               // Firestore database instance
let auth;             // Firebase authentication instance
let userId;           // Current authenticated user ID

/**
 * Application State
 * Tracks the current project and user selections throughout the game flow
 */
const state = {
    bookName: "",           // Title of the book being adapted
    author: "",             // Author of the book
    bookInfo: null,         // Book data from API (popularity, synopsis, characters)
    movieBudget: 0,         // Total movie production budget
    castingBudget: 0,       // Budget allocated for actors
    spentBudget: 0,         // Amount spent on cast so far
    castList: []            // Array of cast objects: {character, actor, fee, popularity}
};

/**
 * DOM Element References
 * Cached references to key screen elements for navigation
 */
const screens = {
    screen1: document.getElementById('screen1'),      // Book entry & recent movies
    screen1_5: document.getElementById('screen1_5'),  // Incoming offer (loading screen)
    screen2: document.getElementById('screen2'),      // Budget reveal
    screen3: document.getElementById('screen3'),      // Casting interface
    screen3_5: document.getElementById('screen3_5'),  // Movie production (loading screen)
    screen4: document.getElementById('screen4'),      // Final results
    screen5: document.getElementById('screen5')       // Movie details
};

const loadingOverlay = document.getElementById('loading-overlay');
const dosModal = document.getElementById('dos-modal');
const dosModalHeader = document.getElementById('dos-modal-header');
const dosModalContent = document.getElementById('dos-modal-content');
const welcomeScreen = document.getElementById('welcome-screen');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Switches between application screens
 * Hides all screens and shows only the specified one
 *
 * @param {string} screenId - The ID of the screen to display (e.g., 'screen1')
 */
function showScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenId]) {
        screens[screenId].classList.add('active');
    }
}

/**
 * Shows or hides the loading overlay
 * Used during API calls and asynchronous operations
 *
 * @param {boolean} show - True to show the overlay, false to hide it
 */
function showLoading(show) {
    loadingOverlay.style.display = show ? 'block' : 'none';
}

/**
 * Displays a modal dialog with a custom message
 * Can show errors, warnings, or informational messages
 *
 * @param {string} message - The message to display (can be HTML)
 * @param {string} title - The modal title (default: "! WARNING !")
 * @param {boolean} isError - Whether to style as an error (red) or info (cyan)
 */
function showModal(message, title = "! WARNING !", isError = true) {
    dosModalHeader.textContent = title;
    dosModalHeader.style.color = isError ? 'var(--dos-error)' : 'var(--dos-header)';

    // Check if message contains HTML tags
    if (message.startsWith('<')) {
        dosModalContent.innerHTML = message;
    } else {
        dosModalContent.textContent = message;
    }

    dosModal.style.display = 'block';
}

/**
 * Formats a number as US currency
 *
 * @param {number} num - The number to format
 * @returns {string} Formatted currency string (e.g., "$1,000,000")
 */
function formatCurrency(num) {
    if (typeof num !== 'number') return '$0';
    return '$' + num.toLocaleString('en-US');
}

/**
 * Converts Letterboxd score (0-5) to star format with half-stars
 * @param {number} score - Score from 0 to 5
 * @returns {string} Star representation (e.g., "★★★★½")
 */
function formatLetterboxdStars(score) {
    const fullStars = Math.floor(score);
    const hasHalf = score % 1 >= 0.25 && score % 1 < 0.75;

    let stars = '★'.repeat(fullStars);
    if (hasHalf) stars += '½';

    return stars;
}

/**
 * Generates thumb icon based on Siskel & Ebert verdict
 * @param {string} verdict - Either "thumbs_up" or "thumbs_down"
 * @returns {string} Emoji representation
 */
function generateThumbIcon(verdict) {
    return verdict === 'thumbs_up' ? '👍' : '👎';
}

/**
 * Gets CSS color class based on overall game score
 * @param {number} score - Score from 0 to 100
 * @returns {string} CSS class name
 */
function getScoreColorClass(score) {
    if (score >= 90) return 'score-exceptional';
    if (score >= 80) return 'score-great';
    if (score >= 70) return 'score-good';
    if (score >= 60) return 'score-decent';
    if (score >= 50) return 'score-mediocre';
    if (score >= 40) return 'score-poor';
    return 'score-disaster';
}

/**
 * Selects a random book from the FAMOUS_BOOKS library
 * and populates the book entry form with it
 * This provides a default suggestion and inspiration for users
 */
function setRandomDefaultBook() {
    const randomIndex = Math.floor(Math.random() * FAMOUS_BOOKS.length);
    const selectedBook = FAMOUS_BOOKS[randomIndex];

    const bookNameInput = document.getElementById('book-name');
    const authorNameInput = document.getElementById('author-name');

    if (bookNameInput && authorNameInput) {
        bookNameInput.value = selectedBook.title;
        authorNameInput.value = selectedBook.author;
    }
}

/**
 * Shows the welcome screen on first visit
 * Checks localStorage to see if user has seen the welcome screen before
 * @returns {boolean} True if welcome screen was shown, false otherwise
 */
/**
 * Shows the welcome screen and starts the intro sequence
 * Always shows on every visit (no localStorage check)
 */
function showWelcomeScreen() {
    welcomeScreen.classList.add('active');
    runIntroSequence();
    return true;
}

/**
 * Hides the welcome screen after intro completes
 * Shows loading overlay while the app initializes
 */
function hideWelcomeScreen() {
    welcomeScreen.classList.remove('active');
    showLoading(true);

    // Give a brief moment for the welcome screen to fade out
    setTimeout(() => {
        showLoading(false);
    }, 500);
}

/**
 * Intro Sequence Variables
 */
let currentPhase = 1;
let introTimeouts = [];
let typingInterval = null;
let dotsInterval = null;
let loadingBarInterval = null;

/**
 * Clear all intro timeouts and intervals
 */
function clearIntroTimers() {
    introTimeouts.forEach(timeout => clearTimeout(timeout));
    introTimeouts = [];
    if (typingInterval) clearInterval(typingInterval);
    if (dotsInterval) clearInterval(dotsInterval);
    if (loadingBarInterval) clearInterval(loadingBarInterval);
    typingInterval = null;
    dotsInterval = null;
    loadingBarInterval = null;
}

/**
 * Switch to a specific phase
 */
function switchToPhase(phaseNumber) {
    // Hide all phases
    for (let i = 1; i <= 5; i++) {
        const phase = document.getElementById(`phase-${i}`);
        if (phase) phase.classList.remove('active');
    }

    // Show target phase
    const targetPhase = document.getElementById(`phase-${phaseNumber}`);
    if (targetPhase) {
        targetPhase.classList.add('active');
        currentPhase = phaseNumber;
    }

    // Hide skip button on phase 5
    const skipButton = document.getElementById('skip-intro');
    if (phaseNumber === 5) {
        skipButton.classList.add('hidden');
    }
}

/**
 * Skip directly to phase 5
 */
function skipToEnd() {
    clearIntroTimers();
    switchToPhase(5);
}

/**
 * Skip Phase 1 and go directly to Phase 2
 */
function skipPhase1() {
    // Clear phase 1 timers
    clearIntroTimers();

    // Reset loading bar
    const loadingBar = document.getElementById('phase-1-progress');
    if (loadingBar) loadingBar.style.width = '0%';

    // Go to phase 2 immediately
    switchToPhase(2);
    typeCommand();

    // Reschedule remaining phases
    introTimeouts.push(setTimeout(() => {
        switchToPhase(3);
        showInitializing();
    }, 2000));

    introTimeouts.push(setTimeout(() => {
        if (dotsInterval) clearInterval(dotsInterval);
        switchToPhase(4);
    }, 7000));

    introTimeouts.push(setTimeout(() => {
        switchToPhase(5);
    }, 12000));
}

/**
 * Animate Phase 1 loading bar from 0 to 100% over 5 seconds
 */
function animatePhase1LoadingBar() {
    const loadingBar = document.getElementById('phase-1-progress');
    if (!loadingBar) return;

    let progress = 0;
    const duration = 5000; // 5 seconds
    const intervalTime = 50; // Update every 50ms
    const increment = (100 / duration) * intervalTime;

    loadingBar.style.width = '0%';

    loadingBarInterval = setInterval(() => {
        progress += increment;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingBarInterval);
            loadingBarInterval = null;
        }
        loadingBar.style.width = `${progress}%`;
    }, intervalTime);
}

/**
 * Main Intro Sequence Orchestration
 */
function runIntroSequence() {
    // Reset
    clearIntroTimers();
    currentPhase = 1;

    // Make sure skip button is visible
    const skipButton = document.getElementById('skip-intro');
    skipButton.classList.remove('hidden');

    // Phase 1: Insert Game Image (5 seconds) with loading bar
    switchToPhase(1);
    animatePhase1LoadingBar();

    // Add click handler to Phase 1 image
    const phase1Image = document.getElementById('phase-1-image');
    if (phase1Image) {
        phase1Image.onclick = skipPhase1;
    }

    introTimeouts.push(setTimeout(() => {
        // Phase 2: DOS Typing
        if (loadingBarInterval) clearInterval(loadingBarInterval);
        switchToPhase(2);
        typeCommand();
    }, 5000));

    // Phase 3 starts after typing completes (~2 seconds after Phase 2)
    introTimeouts.push(setTimeout(() => {
        // Phase 3: Initializing with dots
        switchToPhase(3);
        showInitializing();
    }, 7000));

    // Phase 4: Cover Image (starts 5 seconds after Phase 3)
    introTimeouts.push(setTimeout(() => {
        if (dotsInterval) clearInterval(dotsInterval);
        switchToPhase(4);
    }, 12000));

    // Phase 5: Final Welcome Box (starts 5 seconds after Phase 4)
    introTimeouts.push(setTimeout(() => {
        switchToPhase(5);
    }, 17000));
}

/**
 * Phase 2: Type out "casting_director.exe" character by character
 */
function typeCommand() {
    const command = "casting_director.exe";
    const typedElement = document.getElementById('typed-command');
    const cursor = document.getElementById('typing-cursor');
    let charIndex = 0;

    typedElement.textContent = '';
    cursor.style.display = 'inline';

    typingInterval = setInterval(() => {
        if (charIndex < command.length) {
            typedElement.textContent += command[charIndex];
            charIndex++;
        } else {
            clearInterval(typingInterval);
            cursor.style.display = 'none';
        }
    }, 100); // 100ms per character (medium speed)
}

/**
 * Phase 3: Show "INITIALIZING" with continuous dots for 5 seconds
 */
function showInitializing() {
    const dotsElement = document.getElementById('initializing-dots');
    dotsElement.textContent = '';

    dotsInterval = setInterval(() => {
        dotsElement.textContent += '.';
    }, 500); // Add a dot every 500ms
}

// ============================================================================
// CLOUD FUNCTION API CALLS
// All AI operations now go through secure Cloud Functions
// ============================================================================

/**
 * Normalizes book name and author for cache key (lowercase, trimmed)
 * @param {string} bookName - The book title to normalize
 * @param {string} author - The author name to normalize
 * @returns {string} Normalized cache key
 */
function normalizeBookKey(bookName, author) {
    const normalizedBook = bookName.toLowerCase().trim();
    const normalizedAuthor = author.toLowerCase().trim();
    // Create a unique key by combining book and author
    return `${normalizedAuthor}::${normalizedBook}`;
}

/**
 * Calls the getBookInfo Cloud Function with Firestore caching
 * Checks cache first, then calls API if needed, and caches the result permanently
 * Retrieves book information including popularity, synopsis, and characters
 *
 * @param {string} bookName - The title of the book
 * @param {string} author - The author of the book
 * @returns {Promise<object>} Book information object
 * @throws {Error} If the API call fails
 */
async function callGetBookInfo(bookName, author) {
    const cacheKey = normalizeBookKey(bookName, author);
    const cacheDocRef = doc(db, `artifacts/${appId}/public/data/bookCache`, cacheKey);

    try {
        // Check cache first
        const cacheDoc = await getDoc(cacheDocRef);

        if (cacheDoc.exists()) {
            console.log(`Cache hit for book: ${bookName} by ${author}`);
            const cachedData = cacheDoc.data();
            // Return cached data immediately - no expiration check (permanent cache)
            return {
                popularity: cachedData.popularity,
                synopsis: cachedData.synopsis,
                characters: cachedData.characters,
                movieBudget: cachedData.movieBudget,
                castingBudget: cachedData.castingBudget,
                studio: cachedData.studio,
                budgetReasoning: cachedData.budgetReasoning
            };
        } else {
            console.log(`Cache miss for book: ${bookName} by ${author}`);
        }
    } catch (cacheError) {
        // If cache check fails, log and continue to API call
        console.warn('Cache check failed, falling back to API:', cacheError);
    }

    // Cache miss - call the API
    const response = await fetch(CLOUD_FUNCTIONS.getBookInfo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookName, author })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get book information');
    }

    const result = await response.json();

    // Cache the result permanently for future lookups
    try {
        await setDoc(cacheDocRef, {
            bookName: bookName, // Store original book name
            author: author, // Store original author name
            popularity: result.popularity,
            synopsis: result.synopsis,
            characters: result.characters,
            movieBudget: result.movieBudget,
            castingBudget: result.castingBudget,
            studio: result.studio,
            budgetReasoning: result.budgetReasoning,
            cachedAt: serverTimestamp(),
            source: 'gemini-api'
        });
        console.log(`Cached book data for: ${bookName} by ${author}`);
    } catch (cacheWriteError) {
        // Log but don't fail if cache write fails
        console.warn('Failed to cache book data:', cacheWriteError);
    }

    return result;
}

/**
 * Normalizes actor name for cache key (lowercase, trimmed)
 * @param {string} actorName - The actor name to normalize
 * @returns {string} Normalized actor name
 */
function normalizeActorName(actorName) {
    return actorName.toLowerCase().trim();
}

/**
 * Calls the getActorFee Cloud Function with Firestore caching
 * Checks cache first, then calls API if needed, and caches the result
 * Estimates an actor's per-movie fee and popularity level
 *
 * @param {string} actorName - The name of the actor
 * @returns {Promise<object>} Object with fee and popularity
 * @throws {Error} If the API call fails
 */
async function callGetActorFee(actorName) {
    const normalizedName = normalizeActorName(actorName);
    const cacheDocRef = doc(db, `artifacts/${appId}/public/data/actorCache`, normalizedName);

    try {
        // Check cache first
        const cacheDoc = await getDoc(cacheDocRef);

        if (cacheDoc.exists()) {
            const cachedData = cacheDoc.data();

            // Check if cache has expired (30 days)
            const now = Date.now();
            const cachedAt = cachedData.cachedAt?.toMillis() || 0;
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

            if (now - cachedAt < thirtyDaysInMs) {
                console.log(`Cache hit for actor: ${actorName}`);
                // Return cached data immediately - no write needed
                return {
                    fee: cachedData.fee,
                    popularity: cachedData.popularity
                };
            } else {
                console.log(`Cache expired for actor: ${actorName}`);
            }
        } else {
            console.log(`Cache miss for actor: ${actorName}`);
        }
    } catch (cacheError) {
        // If cache check fails, log and continue to API call
        console.warn('Cache check failed, falling back to API:', cacheError);
    }

    // Cache miss or expired - call the API
    const response = await fetch(CLOUD_FUNCTIONS.getActorFee, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorName })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get actor fee');
    }

    const result = await response.json();

    // Cache the result for future lookups
    try {
        await setDoc(cacheDocRef, {
            actorName: actorName, // Store original name
            fee: result.fee,
            popularity: result.popularity,
            cachedAt: serverTimestamp(),
            source: 'gemini-api'
        });
        console.log(`Cached actor data for: ${actorName}`);
    } catch (cacheWriteError) {
        // Log but don't fail if cache write fails
        console.warn('Failed to cache actor data:', cacheWriteError);
    }

    return result;
}

/**
 * Calls the generateMovieResults Cloud Function
 * Generates box office results, awards, and summary
 *
 * @param {object} movieData - Object containing all movie and cast information
 * @returns {Promise<object>} Object with boxOffice, awards, and summary
 * @throws {Error} If the API call fails
 */
async function callGenerateMovieResults(movieData) {
    // Create AbortController with 3-minute timeout (Gemini Pro can take 1-2 minutes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

    try {
        const response = await fetch(CLOUD_FUNCTIONS.generateMovieResults, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movieData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate movie results');
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after 3 minutes. The AI is taking longer than expected to generate results.');
        }
        throw error;
    }
}

// ============================================================================
// FIREBASE FUNCTIONS
// ============================================================================

/**
 * Initializes Firebase and sets up authentication
 * Connects to Firestore and signs in the user (anonymously by default)
 * Loads recent movies once authentication is complete
 *
 * @returns {Promise<User>} The authenticated Firebase user
 */
async function initFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        setLogLevel('Debug'); // Enable Firestore debug logging

        // Listen for authentication state changes
        return new Promise((resolve) => {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    console.log("User is signed in:", user.uid);
                    userId = user.uid;
                    // Display truncated user ID in header
                    document.getElementById('user-id-display').textContent =
                        `Director ID: ${userId.substring(0, 8)}...`;
                    // User authenticated, load recent movies
                    loadRecentMovies();
                    resolve(user);
                } else {
                    console.log("User is not signed in, attempting anonymous sign-in.");
                    // No user, initiate sign-in
                    signIn();
                }
            });
        });

    } catch (error) {
        console.error("Firebase Init Error:", error);
        showModal("FATAL ERROR: Could not connect to Firebase. Check console.");
    }
}

/**
 * Signs in the user to Firebase
 * Uses custom token if provided, otherwise uses anonymous authentication
 */
async function signIn() {
    try {
        if (initialAuthToken) {
            // Sign in with custom token (if provided)
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            // Default to anonymous sign-in
            await signInAnonymously(auth);
        }
        // onAuthStateChanged callback will handle post-sign-in logic
    } catch (error) {
        console.error("Firebase Sign-In Error:", error);
        showModal("Error: Could not sign in. Features may be limited.");
    }
}

/**
 * Saves a completed movie to Firestore
 * Stores all movie data including cast, budget, box office results, and awards
 *
 * @param {object} results - The movie results from the Gemini API (boxOffice, awards, summary)
 */
async function saveMovieToFirebase(results) {
    if (!db || !userId) {
        showModal("Error: Not connected to Firebase. Cannot save movie.");
        return;
    }

    const movieData = {
        directorId: userId,
        bookName: state.bookName,
        author: state.author,
        bookPopularity: state.bookInfo.popularity,
        movieBudget: state.movieBudget,
        castList: state.castList,           // Array of cast objects
        boxOffice: results.boxOffice,
        awards: results.awards || [],       // Array of award strings
        summary: results.summary,

        // Platform reviews
        imdbScore: results.imdbScore,
        imdbReview: results.imdbReview,
        imdbUsername: results.imdbUsername,
        letterboxdScore: results.letterboxdScore,
        letterboxdReview: results.letterboxdReview,
        letterboxdUsername: results.letterboxdUsername,
        rtCriticsScore: results.rtCriticsScore,
        rtAudienceScore: results.rtAudienceScore,
        rtReview: results.rtReview,
        rtUsername: results.rtUsername,

        // Overall game score
        overallGameScore: results.overallGameScore,
        scoreDescriptor: results.scoreDescriptor,

        // Siskel & Ebert verdict
        siskelReview: results.siskelReview,
        siskelVerdict: results.siskelVerdict,
        ebertReview: results.ebertReview,
        ebertVerdict: results.ebertVerdict,
        finalVerdict: results.finalVerdict,

        // Individual casting scores
        castingScores: results.castingScores || [],

        version: 2,  // Version for backward compatibility
        createdAt: new Date().toISOString()
    };

    try {
        const moviesCollection = collection(db, `/artifacts/${appId}/public/data/movies`);
        const docRef = await addDoc(moviesCollection, movieData);
        console.log("Movie saved with ID: ", docRef.id);

        // Refresh the recent movies list after saving
        await loadRecentMovies();
    } catch (error) {
        console.error("Error saving movie: ", error);
        showModal("Error: Could not save movie results to database. Check console.");
    }
}

/**
 * Loads recent movies from Firestore
 * Fetches the 10 most recent movies ordered by creation date
 */
async function loadRecentMovies() {
    const moviesList = document.getElementById('recent-movies-list');

    if (!db) {
        moviesList.innerHTML = '<li>Database not connected. Enable Anonymous Auth to see recent movies.</li>';
        return;
    }

    try {
        const moviesCollection = collection(db, `/artifacts/${appId}/public/data/movies`);
        const q = query(moviesCollection, orderBy('createdAt', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            moviesList.innerHTML = '<li>No movies cast yet. Be the first!</li>';
            return;
        }

        const movies = [];
        querySnapshot.forEach((doc) => {
            movies.push({ id: doc.id, ...doc.data() });
        });

        displayRecentMovies(movies);
    } catch (error) {
        console.error("Error loading recent movies:", error);
        moviesList.innerHTML = '<li>Error loading movies. Check console.</li>';
    }
}

/**
 * Displays recent movies in the list
 * @param {Array} movies - Array of movie objects
 */
function displayRecentMovies(movies) {
    const moviesList = document.getElementById('recent-movies-list');

    moviesList.innerHTML = movies.map(movie => {
        const boxOffice = formatCurrency(movie.boxOffice || 0);
        const directorShort = movie.directorId ? movie.directorId.substring(0, 8) : 'unknown';

        return `<li onclick="showMovieDetails('${movie.id}')">
            <strong>${movie.bookName}</strong> by ${movie.author}<br>
            Director: ${directorShort} | Box Office: ${boxOffice}
        </li>`;
    }).join('');
}

/**
 * Shows movie details screen for a specific movie
 * @param {string} movieId - The Firestore document ID of the movie
 * @param {boolean} updateUrl - Whether to update the browser URL (default: true)
 */
async function showMovieDetails(movieId, updateUrl = true) {
    showLoading(true);

    try {
        const movieRef = doc(db, `/artifacts/${appId}/public/data/movies`, movieId);
        const movieSnap = await getDoc(movieRef);

        if (!movieSnap.exists()) {
            showModal("Movie not found.");
            showLoading(false);
            return;
        }

        const movieData = movieSnap.data();
        populateScreen5(movieData);
        showScreen('screen5');

        // Update URL with movie ID for deep linking
        if (updateUrl) {
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('movieId', movieId);
            window.history.pushState({ movieId }, '', newUrl);
        }

        showLoading(false);
    } catch (error) {
        console.error("Error loading movie details:", error);
        showModal("Error: Could not load movie details. Check console.");
        showLoading(false);
    }
}

// Make showMovieDetails accessible from inline onclick handlers
window.showMovieDetails = showMovieDetails;

/**
 * Populates screen5 with movie details
 * @param {object} movieData - The movie data object
 */
/**
 * Populates Screen 5 with enhanced movie details from database
 * Matches the format of populateScreen4() for consistency
 * @param {object} movieData - Enhanced movie data (v2) from Firestore
 */
function populateScreen5(movieData) {
    // Basic info
    document.getElementById('detail-project-title').textContent = movieData.bookName;
    document.getElementById('detail-director').textContent =
        movieData.directorId ? movieData.directorId.substring(0, 12) + '...' : 'Unknown';
    document.getElementById('detail-movie-budget').textContent = formatCurrency(movieData.movieBudget);
    document.getElementById('detail-box-office').textContent = formatCurrency(movieData.boxOffice);

    // Profit/loss
    const profit = movieData.boxOffice - movieData.movieBudget;
    const profitElement = document.getElementById('detail-profit-loss');
    profitElement.textContent = `Profit: ${formatCurrency(profit)}`;
    profitElement.style.color = profit >= 0 ? 'var(--dos-green)' : 'var(--dos-error)';

    // Overall Game Score
    document.getElementById('detail-overall-score').textContent = movieData.overallGameScore;
    document.getElementById('detail-score-descriptor').textContent = movieData.scoreDescriptor;

    // IMDB Review
    document.getElementById('detail-imdb-score').textContent = `${movieData.imdbScore} / 10`;
    document.getElementById('detail-imdb-review').textContent = movieData.imdbReview;
    document.getElementById('detail-imdb-username').textContent = `- ${movieData.imdbUsername}`;

    // Letterboxd Review
    const letterboxdStars = formatLetterboxdStars(movieData.letterboxdScore);
    document.getElementById('detail-letterboxd-score').textContent = `${letterboxdStars} (${movieData.letterboxdScore} / 5)`;
    document.getElementById('detail-letterboxd-review').textContent = movieData.letterboxdReview;
    document.getElementById('detail-letterboxd-username').textContent = `- ${movieData.letterboxdUsername}`;

    // Rotten Tomatoes Review
    const rtCriticsElement = document.getElementById('detail-rt-critics');
    rtCriticsElement.textContent = `Critics: ${movieData.rtCriticsScore}%`;
    rtCriticsElement.className = movieData.rtCriticsScore >= 60 ? 'rt-fresh' : 'rt-rotten';

    const rtAudienceElement = document.getElementById('detail-rt-audience');
    rtAudienceElement.textContent = `Audience: ${movieData.rtAudienceScore}%`;
    rtAudienceElement.className = movieData.rtAudienceScore >= 60 ? 'rt-fresh' : 'rt-rotten';

    document.getElementById('detail-rt-review').textContent = movieData.rtReview;
    document.getElementById('detail-rt-username').textContent = `- ${movieData.rtUsername}`;

    // Siskel & Ebert Verdict
    document.getElementById('detail-siskel-review').textContent = movieData.siskelReview;
    document.getElementById('detail-siskel-verdict').textContent = generateThumbIcon(movieData.siskelVerdict);
    document.getElementById('detail-ebert-review').textContent = movieData.ebertReview;
    document.getElementById('detail-ebert-verdict').textContent = generateThumbIcon(movieData.ebertVerdict);

    const finalVerdictElement = document.getElementById('detail-final-verdict');
    if (movieData.finalVerdict === 'recommended') {
        finalVerdictElement.textContent = '✅ RECOMMENDED';
        finalVerdictElement.className = 'final-verdict-box verdict-positive';
    } else if (movieData.finalVerdict === 'not_recommended') {
        finalVerdictElement.textContent = '❌ NOT RECOMMENDED';
        finalVerdictElement.className = 'final-verdict-box verdict-negative';
    } else {
        finalVerdictElement.textContent = '⚠️ MIXED RECEPTION';
        finalVerdictElement.className = 'final-verdict-box verdict-mixed';
    }

    // Awards
    const awardsList = document.getElementById('detail-awards');
    if (movieData.awards && movieData.awards.length > 0) {
        awardsList.innerHTML = movieData.awards.map(award => `<li>• ${award}</li>`).join('');
    } else {
        awardsList.innerHTML = '<li>None. Not even a nomination. Ouch.</li>';
    }

    // Cast list with casting scores
    const castListElement = document.getElementById('detail-cast-list');
    if (movieData.castingScores && movieData.castingScores.length > 0) {
        castListElement.innerHTML = movieData.castingScores.map((castScore, index) => {
            const scoreEmoji = castScore.score >= 8 ? ' ⭐' : '';
            // Fallback to castList if API values are undefined
            const actor = castScore.actor || (movieData.castList && movieData.castList[index] ? movieData.castList[index].actor : 'Unknown');
            const character = castScore.character || (movieData.castList && movieData.castList[index] ? movieData.castList[index].character : 'Unknown');
            const score = castScore.score !== undefined ? castScore.score : 0;
            return `<li>${character}: ${actor} - ${score}/10${scoreEmoji}<br/><span style="color: var(--dos-gray); font-size: 14px;">${castScore.reasoning || ''}</span></li>`;
        }).join('');
    } else {
        castListElement.innerHTML = '<li>No cast information available.</li>';
    }
}

// ============================================================================
// GAME LOGIC FUNCTIONS
// ============================================================================

/**
 * Populates Screen 2 (Budget Reveal) with AI-calculated budgets
 * Displays the project title, movie budget, casting budget, studio, and reasoning
 * Budget data now comes directly from the AI via the Cloud Function
 */
function populateScreen2() {
    document.getElementById('project-title').textContent = `${state.bookName}`;
    document.getElementById('movie-budget').textContent = formatCurrency(state.bookInfo.movieBudget);
    document.getElementById('casting-budget').textContent = formatCurrency(state.bookInfo.castingBudget);
    document.getElementById('studio-name').textContent = state.bookInfo.studio;
    document.getElementById('budget-reason').textContent = state.bookInfo.budgetReasoning;
}

/**
 * Populates Screen 3 (Casting Interface) with character cards
 * Creates an input field and cast button for each character
 * Sets up event listeners for casting and recasting actions
 */
function populateScreen3() {
    // Update budget displays
    document.getElementById('total-casting-budget').textContent = formatCurrency(state.castingBudget);
    updateSpentBudget();

    const characterList = document.getElementById('character-list');
    characterList.innerHTML = ""; // Clear previous characters

    // Create a card for each character
    state.bookInfo.characters.forEach((char, index) => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.innerHTML = `
            <h4>${char.name}</h4>
            <p>${char.description}</p>
            <div class="casting-input-group" id="casting-group-${index}">
                <label for="actor-name-${index}">Actor:</label>
                <input type="text" id="actor-name-${index}" data-index="${index}">
                <button class="cast-button" data-index="${index}">CAST</button>
            </div>
            <div class="checkbox-container">
                <input type="checkbox" id="no-name-${index}" data-index="${index}">
                <label for="no-name-${index}">Go "No-Name" ($100,000)</label>
            </div>
            <div id="cast-info-${index}" class="cast-info"></div>
        `;
        characterList.appendChild(card);
    });

    // Set up event delegation for cast and recast buttons
    characterList.addEventListener('click', (event) => {
        if (event.target.classList.contains('cast-button')) {
            handleCastActor(event);
        }
        if (event.target.classList.contains('recast-button')) {
            handleRecast(event);
        }
    });

    // Handle "No-Name" checkbox changes
    characterList.addEventListener('change', (event) => {
        if (event.target.matches('.checkbox-container input[type="checkbox"]')) {
            const index = event.target.dataset.index;
            const actorNameInput = document.getElementById(`actor-name-${index}`);
            const castButton = document.querySelector(`.cast-button[data-index="${index}"]`);

            if (event.target.checked) {
                // "No-Name" checked: disable input and cast immediately
                actorNameInput.disabled = true;
                actorNameInput.value = "";
                castButton.disabled = true;
                castNoNameActor(index);
            } else {
                // "No-Name" unchecked: re-enable input and clear cast
                actorNameInput.disabled = false;
                castButton.disabled = false;
                clearCastInfo(index);
            }
        }
    });
}

/**
 * Handles casting a named actor for a character
 * Makes an API call to estimate the actor's fee, then updates the UI and state
 *
 * @param {Event} event - The click event from the cast button
 */
async function handleCastActor(event) {
    const index = event.target.dataset.index;
    const actorNameInput = document.getElementById(`actor-name-${index}`);
    const actorName = actorNameInput.value;
    const noNameCheckbox = document.getElementById(`no-name-${index}`);
    const castInfoDisplay = document.getElementById(`cast-info-${index}`);

    let fee = 0;
    let popularity = "Unknown";

    if (!actorName) {
        showModal("Please enter an actor's name.");
        return;
    }

    showLoading(true);

    // Call Cloud Function to estimate actor's fee
    try {
        const result = await callGetActorFee(actorName);

        fee = result.fee;
        popularity = result.popularity;

        // Enforce minimum fee of $50,000
        if (fee < 50000) {
            fee = 50000;
        }

    } catch (error) {
        console.error("Failed to get actor fee:", error);
        showModal("Error: Could not retrieve actor fee. Assigning default fee.");
        fee = 500000; // Default fee on error
        popularity = "Working Actor (Est.)";
    } finally {
        showLoading(false);
    }

    // Store cast information in state
    state.castList[index] = {
        character: state.bookInfo.characters[index].name,
        actor: actorName,
        fee: fee,
        popularity: popularity
    };

    // Update UI to show the cast actor
    castInfoDisplay.innerHTML =
        `CAST: ${actorName} (${formatCurrency(fee)}) <button class="recast-button" data-index="${index}">[X]</button>`;

    // Disable controls after casting
    actorNameInput.disabled = true;
    event.target.disabled = true;
    noNameCheckbox.disabled = true;

    updateSpentBudget();
}

/**
 * Casts a "No-Name" actor for a character
 * Uses a fixed fee of $100,000 and doesn't require an API call
 *
 * @param {number} index - The character index in the cast list
 */
function castNoNameActor(index) {
    const fee = 100000;
    const popularity = "No-Name";
    const finalActorName = `Unknown Actor (${state.bookInfo.characters[index].name})`;
    const castInfoDisplay = document.getElementById(`cast-info-${index}`);

    // Store cast information in state
    state.castList[index] = {
        character: state.bookInfo.characters[index].name,
        actor: finalActorName,
        fee: fee,
        popularity: popularity
    };

    // Update UI to show the no-name actor
    castInfoDisplay.innerHTML =
        `CAST: ${finalActorName} (${formatCurrency(fee)}) <button class="recast-button" data-index="${index}">[X]</button>`;

    updateSpentBudget();
}

/**
 * Clears the cast information for a character
 * Re-enables all controls and resets the UI and state
 *
 * @param {number} index - The character index to clear
 */
function clearCastInfo(index) {
    const castInfoDisplay = document.getElementById(`cast-info-${index}`);
    const actorNameInput = document.getElementById(`actor-name-${index}`);
    const castButton = document.querySelector(`.cast-button[data-index="${index}"]`);
    const noNameCheckbox = document.getElementById(`no-name-${index}`);

    // Clear state
    state.castList[index] = null;

    // Reset UI
    castInfoDisplay.innerHTML = "";
    actorNameInput.disabled = false;
    actorNameInput.value = "";
    castButton.disabled = false;
    noNameCheckbox.disabled = false;
    noNameCheckbox.checked = false;

    updateSpentBudget();
}

/**
 * Handles the click event for the recast button
 * Clears the cast for that character so the user can choose a different actor
 *
 * @param {Event} event - The click event from the recast button
 */
function handleRecast(event) {
    const index = event.target.dataset.index;
    clearCastInfo(index);
}

/**
 * Updates the spent budget display
 * Calculates total cost of all cast actors and updates the UI
 * Highlights the budget in red if over the casting budget
 */
function updateSpentBudget() {
    // Calculate total spent on cast
    state.spentBudget = state.castList.reduce((acc, actor) => {
        return acc + (actor ? actor.fee : 0);
    }, 0);

    const spentDisplay = document.getElementById('spent-casting-budget');
    spentDisplay.textContent = formatCurrency(state.spentBudget);

    // Highlight in red if over budget
    if (state.spentBudget > state.castingBudget) {
        spentDisplay.classList.add('budget-over');
    } else {
        spentDisplay.classList.remove('budget-over');
    }
}

/**
 * Populates Screen 4 (Final Results) with the movie's performance
 * Displays box office, awards, and a summary of the movie's reception
 *
 * @param {object} results - The results object from the Gemini API
 */
/**
 * Populates Screen 4 with comprehensive movie premiere results
 * Includes platform reviews, casting scores, Siskel & Ebert verdict, and overall game score
 * @param {object} results - Results from generateMovieResults Cloud Function
 */
function populateScreen4(results) {
    // Basic info
    document.getElementById('final-project-title').textContent = state.bookName;
    document.getElementById('final-budget').textContent = formatCurrency(state.movieBudget);
    document.getElementById('final-box-office').textContent = formatCurrency(results.boxOffice);

    // Calculate and display profit/loss
    const profit = results.boxOffice - state.movieBudget;
    const profitElement = document.getElementById('profit-loss');
    profitElement.textContent = `Profit: ${formatCurrency(profit)}`;
    profitElement.style.color = profit >= 0 ? 'var(--dos-green)' : 'var(--dos-error)';

    // Overall Game Score
    document.getElementById('overall-score').textContent = results.overallGameScore;
    document.getElementById('score-descriptor').textContent = results.scoreDescriptor;

    // IMDB Review
    document.getElementById('imdb-score').textContent = `${results.imdbScore} / 10`;
    document.getElementById('imdb-review').textContent = results.imdbReview;
    document.getElementById('imdb-username').textContent = `- ${results.imdbUsername}`;

    // Letterboxd Review
    const letterboxdStars = formatLetterboxdStars(results.letterboxdScore);
    document.getElementById('letterboxd-score').textContent = `${letterboxdStars} (${results.letterboxdScore} / 5)`;
    document.getElementById('letterboxd-review').textContent = results.letterboxdReview;
    document.getElementById('letterboxd-username').textContent = `- ${results.letterboxdUsername}`;

    // Rotten Tomatoes Review
    const rtCriticsElement = document.getElementById('rt-critics');
    rtCriticsElement.textContent = `Critics: ${results.rtCriticsScore}%`;
    rtCriticsElement.className = results.rtCriticsScore >= 60 ? 'rt-fresh' : 'rt-rotten';

    const rtAudienceElement = document.getElementById('rt-audience');
    rtAudienceElement.textContent = `Audience: ${results.rtAudienceScore}%`;
    rtAudienceElement.className = results.rtAudienceScore >= 60 ? 'rt-fresh' : 'rt-rotten';

    document.getElementById('rt-review').textContent = results.rtReview;
    document.getElementById('rt-username').textContent = `- ${results.rtUsername}`;

    // Siskel & Ebert Verdict
    document.getElementById('siskel-review').textContent = results.siskelReview;
    document.getElementById('siskel-verdict').textContent = generateThumbIcon(results.siskelVerdict);
    document.getElementById('ebert-review').textContent = results.ebertReview;
    document.getElementById('ebert-verdict').textContent = generateThumbIcon(results.ebertVerdict);

    const finalVerdictElement = document.getElementById('final-verdict');
    if (results.finalVerdict === 'recommended') {
        finalVerdictElement.textContent = '✅ RECOMMENDED';
        finalVerdictElement.className = 'final-verdict-box verdict-positive';
    } else if (results.finalVerdict === 'not_recommended') {
        finalVerdictElement.textContent = '❌ NOT RECOMMENDED';
        finalVerdictElement.className = 'final-verdict-box verdict-negative';
    } else {
        finalVerdictElement.textContent = '⚠️ MIXED RECEPTION';
        finalVerdictElement.className = 'final-verdict-box verdict-mixed';
    }

    // Awards
    const awardsList = document.getElementById('final-awards');
    if (results.awards && results.awards.length > 0) {
        awardsList.innerHTML = results.awards.map(award => `<li>• ${award}</li>`).join('');
    } else {
        awardsList.innerHTML = '<li>None. Not even a nomination. Ouch.</li>';
    }

    // Cast list with casting scores
    const castListElement = document.getElementById('final-cast-list');
    if (results.castingScores && results.castingScores.length > 0) {
        castListElement.innerHTML = results.castingScores.map((castScore, index) => {
            const scoreEmoji = castScore.score >= 8 ? ' ⭐' : '';
            // Use actor from castScore if available, otherwise fall back to state.castList
            const actor = castScore.actor || (state.castList[index] ? state.castList[index].actor : 'Unknown');
            const character = castScore.character || (state.castList[index] ? state.castList[index].character : 'Unknown');
            const score = castScore.score !== undefined ? castScore.score : 0;
            return `<li>${character}: ${actor} - ${score}/10${scoreEmoji}<br/><span style="color: var(--dos-gray); font-size: 14px;">${castScore.reasoning || ''}</span></li>`;
        }).join('');
    } else {
        // Fallback to old format if castingScores not available
        if (state.castList && state.castList.length > 0) {
            castListElement.innerHTML = state.castList.map(cast =>
                `<li>${cast.character}: ${cast.actor} (${formatCurrency(cast.fee)} - ${cast.popularity})</li>`
            ).join('');
        } else {
            castListElement.innerHTML = '<li>No cast information available.</li>';
        }
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Screen 1: Book Entry
 * Handles submission of book title and author
 * Makes API call to get book information, then advances to budget screen
 */
document.getElementById('submit-book').addEventListener('click', async () => {
    state.bookName = document.getElementById('book-name').value;
    state.author = document.getElementById('author-name').value;

    if (!state.bookName || !state.author) {
        showModal("Please enter both a book and author name.");
        return;
    }

    // Show Screen 1.5 (Incoming Offer) while loading
    showScreen('screen1_5');

    // Show loading bar
    const loadingOverlay = document.getElementById('screen1_5-loading');
    const statusText = document.querySelector('.screen1_5-status-text');
    loadingOverlay.classList.add('active');

    let apiComplete = false;
    let skipWait = false;

    // Allow user to skip the wait by clicking on Screen 1.5
    const skipHandler = () => {
        skipWait = true;
        if (apiComplete) {
            loadingOverlay.classList.remove('active');
            showScreen('screen2');
        }
    };
    screens.screen1_5.addEventListener('click', skipHandler, { once: true });

    try {
        // Call Cloud Function to analyze the book
        const result = await callGetBookInfo(state.bookName, state.author);

        state.bookInfo = result;
        state.castList = new Array(result.characters.length).fill(null); // Initialize cast list

        // Set budgets from AI response
        state.movieBudget = result.movieBudget;
        state.castingBudget = result.castingBudget;

        populateScreen2();
        apiComplete = true;

        // Update status text
        statusText.innerHTML = 'ANALYSIS COMPLETE<span class="loading-dots"></span>';

        // If user already clicked to skip, go immediately to Screen 2
        if (skipWait) {
            loadingOverlay.classList.remove('active');
            showScreen('screen2');
        } else {
            // Otherwise wait 2 seconds for dramatic effect
            await new Promise(resolve => setTimeout(resolve, 2000));
            loadingOverlay.classList.remove('active');
            showScreen('screen2');
        }

    } catch (error) {
        console.error("Failed to get book info:", error);
        loadingOverlay.classList.remove('active');
        showModal("Error: Could not retrieve book information from the studio database. Check console.");
        showScreen('screen1'); // Return to Screen 1 on error
    }
});

/**
 * Screen 1: Refresh Movies Button
 * Manually refreshes the recent movies list
 */
document.getElementById('refresh-movies').addEventListener('click', loadRecentMovies);

/**
 * Screen 2: Navigation Buttons
 * "Get to Casting" advances to the casting screen
 * "Main Menu" returns to the initial screen
 */
document.getElementById('go-to-casting').addEventListener('click', () => {
    populateScreen3();
    showScreen('screen3');
});

document.getElementById('back-to-main').addEventListener('click', () => showScreen('screen1'));

/**
 * Screen 3: Back to Main Menu Button
 */
document.getElementById('back-to-main-from-cast').addEventListener('click', () => showScreen('screen1'));

/**
 * Screen 5: Back to Main Button
 */
document.getElementById('back-to-main-from-details').addEventListener('click', () => {
    // Clear the movieId from URL when going back to main
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete('movieId');
    window.history.pushState({}, '', newUrl);
    showScreen('screen1');
});

/**
 * Screen 3: Make the Movie Button
 * Validates that all roles are cast, shows Screen 3.5 loading animation,
 * then makes API call for results. Saves the movie to Firestore and displays final results
 */
document.getElementById('make-movie').addEventListener('click', async () => {
    // Check if all characters have been cast
    const allCast = state.castList.every(actor => actor !== null);
    if (!allCast) {
        showModal("You must cast all roles before making the movie!");
        return;
    }

    // Show Screen 3.5 (Movie Production)
    showScreen('screen3_5');

    // Get references to Screen 3.5 elements
    const loadingOverlay = document.getElementById('screen3_5-loading');
    const movieMakingImage = document.getElementById('movie-making-image');
    const progressBar = document.getElementById('screen3_5-progress-bar');
    const progressPercent = document.getElementById('screen3_5-progress-percent');

    loadingOverlay.classList.add('active');

    let apiComplete = false;
    let apiResults = null;

    // Image cycling: 4 images, 15 seconds each
    const images = [
        'images/movie_making_1.png',
        'images/movie_making_2.png',
        'images/movie_making_3.png',
        'images/movie_making_4.png'
    ];
    let currentImageIndex = 0;

    const cycleImage = () => {
        if (apiComplete) return; // Stop cycling if API is done

        // Fade out current image
        movieMakingImage.classList.add('fade-out');

        setTimeout(() => {
            // Change image source
            currentImageIndex = (currentImageIndex + 1) % images.length;
            movieMakingImage.src = images[currentImageIndex];

            // Fade in new image
            movieMakingImage.classList.remove('fade-out');
        }, 500); // Wait for fade-out to complete
    };

    // Start image cycling every 15 seconds
    const imageCycleInterval = setInterval(cycleImage, 15000);

    // Progress bar animation: 0-100% over 60 seconds
    const totalDuration = 60000; // 60 seconds
    const updateInterval = 100; // Update every 100ms
    const incrementPerUpdate = (100 / (totalDuration / updateInterval));
    let currentProgress = 0;

    const progressInterval = setInterval(() => {
        if (apiComplete) {
            // If API completes early, jump to 100%
            currentProgress = 100;
            progressBar.style.width = '100%';
            progressPercent.textContent = '100';
            clearInterval(progressInterval);
            return;
        }

        currentProgress = Math.min(currentProgress + incrementPerUpdate, 100);
        progressBar.style.width = currentProgress + '%';
        progressPercent.textContent = Math.floor(currentProgress);

        if (currentProgress >= 100) {
            clearInterval(progressInterval);
        }
    }, updateInterval);

    // Format cast details for the API prompt with character descriptions
    const castDetails = state.castList.map((c, index) => {
        const characterInfo = state.bookInfo.characters[index];
        return `${characterInfo.name} (${characterInfo.description}): ${c.actor} (${formatCurrency(c.fee)}) - ${c.popularity}`;
    }).join("\n");

    const wentOverBudget = state.spentBudget > state.castingBudget;

    try {
        // Call Cloud Function to generate movie results
        const results = await callGenerateMovieResults({
            bookName: state.bookName,
            bookPopularity: state.bookInfo.popularity,
            movieBudget: formatCurrency(state.movieBudget),
            castingBudget: formatCurrency(state.castingBudget),
            spentBudget: formatCurrency(state.spentBudget),
            wentOverBudget: wentOverBudget,
            castDetails: castDetails
        });

        apiResults = results;
        apiComplete = true;

        // Stop cycling images
        clearInterval(imageCycleInterval);

        // Wait for progress bar to reach 100% if it hasn't already
        const waitForProgress = () => {
            if (currentProgress >= 100) {
                // Small delay for dramatic effect
                setTimeout(() => {
                    loadingOverlay.classList.remove('active');
                    populateScreen4(apiResults);
                    showScreen('screen4');

                    // Save results to Firebase in the background (non-blocking, optional)
                    saveMovieToFirebase(apiResults).catch(err => {
                        console.warn("Could not save movie to Firebase:", err);
                        // Don't show error to user - saving is optional
                    });
                }, 500);
            } else {
                // Check again in 100ms
                setTimeout(waitForProgress, 100);
            }
        };

        waitForProgress();

    } catch (error) {
        console.error("Failed to make movie:", error);
        clearInterval(imageCycleInterval);
        clearInterval(progressInterval);
        loadingOverlay.classList.remove('active');
        showModal("Error: The studio computers crashed while making the movie. Check console.");
        showScreen('screen3'); // Return to casting screen on error
    }
});

/**
 * Modal: OK Button
 * Closes the modal dialog
 */
document.getElementById('dos-modal-ok').addEventListener('click', () => {
    dosModal.style.display = 'none';
});

/**
 * Welcome Screen: Boot Button
 * Dismisses the welcome screen when clicked
 */
document.getElementById('boot-system').addEventListener('click', () => {
    clearIntroTimers();
    hideWelcomeScreen();
});

/**
 * Welcome Screen: Skip Button
 * Skips intro sequence and jumps to phase 5
 */
document.getElementById('skip-intro').addEventListener('click', () => {
    skipToEnd();
});

/**
 * Welcome Screen: Enter Key Support
 * Allows dismissing welcome screen with Enter key (only from phase 5)
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && welcomeScreen.classList.contains('active') && currentPhase === 5) {
        clearIntroTimers();
        hideWelcomeScreen();
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Display app version in bottom right corner
 */
function displayVersion() {
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
        try {
            const versionInfo = getFullVersionInfo();
            versionElement.textContent = versionInfo;
        } catch (error) {
            // If version.js doesn't exist yet, show fallback
            versionElement.textContent = 'v1.0.0';
            console.warn('Version file not found. Run "npm run version" to generate it.');
        }
    }
}

/**
 * Application initialization
 * Runs when the DOM is fully loaded
 * Initializes Firebase, authenticates user, and displays the first screen
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Display version
    displayVersion();

    // Check for deep link to a specific movie
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('movieId');

    // Show welcome screen every time (unless deep linking to a movie)
    const showWelcome = !movieId;

    if (showWelcome) {
        showWelcomeScreen();
    } else {
        // If deep linking, skip welcome screen
        showLoading(true);
    }

    setRandomDefaultBook(); // Set a random book as default suggestion
    await initFirebase(); // Connect to Firebase and authenticate
    await loadRecentMovies(); // Load recent movies list

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
