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
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
    screen1: document.getElementById('screen1'),  // Book entry & recent movies
    screen2: document.getElementById('screen2'),  // Budget reveal
    screen3: document.getElementById('screen3'),  // Casting interface
    screen4: document.getElementById('screen4')   // Final results
};

const loadingOverlay = document.getElementById('loading-overlay');
const dosModal = document.getElementById('dos-modal');
const dosModalHeader = document.getElementById('dos-modal-header');
const dosModalContent = document.getElementById('dos-modal-content');

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

// ============================================================================
// CLOUD FUNCTION API CALLS
// All AI operations now go through secure Cloud Functions
// ============================================================================

/**
 * Calls the getBookInfo Cloud Function
 * Retrieves book information including popularity, synopsis, and characters
 *
 * @param {string} bookName - The title of the book
 * @param {string} author - The author of the book
 * @returns {Promise<object>} Book information object
 * @throws {Error} If the API call fails
 */
async function callGetBookInfo(bookName, author) {
    const response = await fetch(CLOUD_FUNCTIONS.getBookInfo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookName, author })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get book information');
    }

    return await response.json();
}

/**
 * Calls the getActorFee Cloud Function
 * Estimates an actor's per-movie fee and popularity level
 *
 * @param {string} actorName - The name of the actor
 * @returns {Promise<object>} Object with fee and popularity
 * @throws {Error} If the API call fails
 */
async function callGetActorFee(actorName) {
    const response = await fetch(CLOUD_FUNCTIONS.getActorFee, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorName })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get actor fee');
    }

    return await response.json();
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
    const response = await fetch(CLOUD_FUNCTIONS.generateMovieResults, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movieData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate movie results');
    }

    return await response.json();
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
        awards: results.awards,              // Array of award strings
        summary: results.summary,
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
 */
async function showMovieDetails(movieId) {
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
function populateScreen5(movieData) {
    document.getElementById('detail-project-title').textContent =
        `${movieData.bookName} by ${movieData.author}`;
    document.getElementById('detail-director').textContent =
        movieData.directorId ? movieData.directorId.substring(0, 12) + '...' : 'Unknown';

    document.getElementById('detail-movie-budget').textContent =
        formatCurrency(movieData.movieBudget);
    document.getElementById('detail-box-office').textContent =
        formatCurrency(movieData.boxOffice);

    // Display cast list with fees
    const castListDiv = document.getElementById('detail-cast-list');
    if (movieData.castList && movieData.castList.length > 0) {
        castListDiv.innerHTML = movieData.castList.map(cast => `
            <div class="budget-display">
                <strong>${cast.character}:</strong> ${cast.actor}<br>
                Fee: ${formatCurrency(cast.fee)} | ${cast.popularity}
            </div>
        `).join('');
    } else {
        castListDiv.innerHTML = '<p>No cast information available.</p>';
    }

    // Display awards
    const awardsList = document.getElementById('detail-awards');
    if (movieData.awards && movieData.awards.length > 0) {
        awardsList.innerHTML = movieData.awards.map(award =>
            `<li>${award}</li>`
        ).join('');
    } else {
        awardsList.innerHTML = '<li>No awards</li>';
    }

    // Display summary
    document.getElementById('detail-summary').textContent =
        movieData.summary || 'No summary available.';
}

// ============================================================================
// GAME LOGIC FUNCTIONS
// ============================================================================

/**
 * Calculates movie and casting budgets based on the book's popularity
 * Also generates a fun explanation for the budget allocation
 *
 * Budget tiers:
 * - Massive Bestseller: $200M movie / $50M casting
 * - Cult Classic: $50M movie / $10M casting
 * - Obscure Find: $5M movie / $1M casting
 */
function calculateBudgets() {
    const pop = state.bookInfo.popularity.toLowerCase();
    let reason = "";

    if (pop.includes('bestseller') || pop.includes('massive')) {
        state.movieBudget = 200000000;
        state.castingBudget = 50000000;
        reason = "This book is a juggernaut! The studio is throwing money at it. They expect A-List talent and a summer blockbuster. Don't let them down.";
    } else if (pop.includes('cult classic') || pop.includes('beloved')) {
        state.movieBudget = 50000000;
        state.castingBudget = 10000000;
        reason = "It's a beloved 'cult classic.' The budget is respectable, but not a blank check. The fans are passionate, so the casting has to be perfect, not just expensive.";
    } else {
        state.movieBudget = 5000000;
        state.castingBudget = 1000000;
        reason = "This is an 'obscure find.' The studio is taking a risk, so the budget is shoestring. You'll need to find hidden gems and 'no-name' actors to make this work.";
    }

    state.bookInfo.budgetReason = reason;
}

/**
 * Populates Screen 2 (Budget Reveal) with the calculated budgets
 * Displays the project title, movie budget, casting budget, and reasoning
 */
function populateScreen2() {
    document.getElementById('project-title').textContent = `${state.bookName}`;
    document.getElementById('movie-budget').textContent = formatCurrency(state.movieBudget);
    document.getElementById('casting-budget').textContent = formatCurrency(state.castingBudget);
    document.getElementById('budget-reason').textContent = state.bookInfo.budgetReason;
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
function populateScreen4(results) {
    document.getElementById('final-project-title').textContent = state.bookName;
    document.getElementById('final-budget').textContent = formatCurrency(state.movieBudget);
    document.getElementById('final-box-office').textContent = formatCurrency(results.boxOffice);

    // Display awards list
    const awardsList = document.getElementById('final-awards');
    awardsList.innerHTML = "";

    if (results.awards.length === 0) {
        awardsList.innerHTML = "<li>None. Not even a nomination. Ouch.</li>";
    } else {
        results.awards.forEach(award => {
            const li = document.createElement('li');
            li.textContent = award;
            awardsList.appendChild(li);
        });
    }

    document.getElementById('final-summary').textContent = results.summary;
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

    showLoading(true);

    try {
        // Call Cloud Function to analyze the book
        const result = await callGetBookInfo(state.bookName, state.author);

        state.bookInfo = result;
        state.castList = new Array(result.characters.length).fill(null); // Initialize cast list
        calculateBudgets();
        populateScreen2();
        showScreen('screen2');

    } catch (error) {
        console.error("Failed to get book info:", error);
        showModal("Error: Could not retrieve book information from the studio database. Check console.");
    } finally {
        showLoading(false);
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
document.getElementById('back-to-main-from-details').addEventListener('click', () => showScreen('screen1'));

/**
 * Screen 3: Make the Movie Button
 * Validates that all roles are cast, then makes API call for results
 * Saves the movie to Firestore and displays final results
 */
document.getElementById('make-movie').addEventListener('click', async () => {
    // Check if all characters have been cast
    const allCast = state.castList.every(actor => actor !== null);
    if (!allCast) {
        showModal("You must cast all roles before making the movie!");
        return;
    }

    showLoading(true);

    // Format cast details for the API prompt
    const castDetails = state.castList.map(c =>
        `* ${c.character} played by ${c.actor} (Fee: ${formatCurrency(c.fee)}, Popularity: ${c.popularity})`
    ).join("\n");

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

        // Show results immediately
        populateScreen4(results);
        showScreen('screen4');
        showLoading(false);

        // Save results to Firebase in the background (non-blocking, optional)
        saveMovieToFirebase(results).catch(err => {
            console.warn("Could not save movie to Firebase:", err);
            // Don't show error to user - saving is optional
        });

    } catch (error) {
        console.error("Failed to make movie:", error);
        showModal("Error: The studio computers crashed while making the movie. Check console.");
        showLoading(false);
    }
});

/**
 * Modal: OK Button
 * Closes the modal dialog
 */
document.getElementById('dos-modal-ok').addEventListener('click', () => {
    dosModal.style.display = 'none';
});

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Application initialization
 * Runs when the DOM is fully loaded
 * Initializes Firebase, authenticates user, and displays the first screen
 */
document.addEventListener('DOMContentLoaded', async () => {
    showLoading(true);
    await initFirebase(); // Connect to Firebase and authenticate
    await loadRecentMovies(); // Load recent movies list
    showLoading(false);
    showScreen('screen1'); // Start on the book entry screen
});
