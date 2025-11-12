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
// GEMINI API PROMPTS & SCHEMAS
// All AI prompts are stored here for easy modification and maintenance
// ============================================================================

/**
 * PROMPT 1: Book Information Retrieval
 * Analyzes a book and returns its popularity, synopsis, and main characters
 */
const BOOK_INFO_PROMPT = {
    systemPrompt: "You are a movie production database. Respond with ONLY a valid JSON object. Do not add markdown.",

    // Template function to generate user query
    getUserQuery: (bookName, author) =>
        `Analyze the book '${bookName}' by '${author}'. Respond with this JSON schema. Find the 4 most important main characters.`,

    // JSON schema for the expected response
    schema: {
        type: "OBJECT",
        properties: {
            popularity: {
                type: "STRING",
                description: "e.g., 'Massive Bestseller', 'Cult Classic', 'Obscure Find'"
            },
            synopsis: {
                type: "STRING",
                description: "A 2-sentence synopsis"
            },
            characters: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING" },
                        description: {
                            type: "STRING",
                            description: "1-2 sentence description including age, ethnicity if known, and key traits"
                        }
                    },
                    required: ["name", "description"]
                }
            }
        },
        required: ["popularity", "synopsis", "characters"]
    }
};

/**
 * PROMPT 2: Actor Fee Estimation
 * Estimates an actor's per-movie fee and popularity level
 */
const ACTOR_FEE_PROMPT = {
    systemPrompt: "You are an expert Hollywood talent agent database. Provide a realistic, current per-movie booking fee in US dollars. Respond with ONLY a valid JSON object. Do not add markdown.",

    // Template function to generate user query
    getUserQuery: (actorName) =>
        `Estimate the per-movie fee and popularity for actor '${actorName}'. Respond with this JSON schema.`,

    // JSON schema for the expected response
    schema: {
        type: "OBJECT",
        properties: {
            fee: { type: "NUMBER" },
            popularity: {
                type: "STRING",
                description: "e.g., 'A-List', 'Working Actor', 'Up-and-Comer'"
            }
        },
        required: ["fee", "popularity"]
    }
};

/**
 * PROMPT 3: Movie Results Generation
 * Generates box office results, awards, and a fun summary of the movie's reception
 */
const MOVIE_RESULTS_PROMPT = {
    systemPrompt: "You are a fun, snarky 90s movie critic. Respond with ONLY a valid JSON object. Do not add markdown.",

    // Template function to generate user query
    getUserQuery: (bookName, bookPopularity, movieBudget, castingBudget, spentBudget, wentOverBudget, castDetails) => `
        Hypothesize the movie results based on this data. Be fun and lighthearted.
        - Book: ${bookName} (Popularity: ${bookPopularity})
        - Movie Budget: ${movieBudget}
        - Casting Budget: ${castingBudget}
        - Total Spent on Cast: ${spentBudget} (Went Over Budget: ${wentOverBudget})
        - The Cast:
        ${castDetails}

        How well did this movie do? Consider the book's popularity, the cast's fit and popularity, and the budget.
        Respond with this JSON schema.
    `,

    // JSON schema for the expected response
    schema: {
        type: "OBJECT",
        properties: {
            boxOffice: {
                type: "NUMBER",
                description: "Total box office gross as a number"
            },
            awards: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "List of awards, e.g., 'Best Actor (Oscar)', 'Worst Director (Razzie)'"
            },
            summary: {
                type: "STRING",
                description: "A 1-2 paragraph fun, snarky summary of the movie's release and reception."
            }
        },
        required: ["boxOffice", "awards", "summary"]
    }
};

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
    onSnapshot,
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
 * Gemini API Key
 * IMPORTANT: Replace this with your actual Gemini API key from Google AI Studio
 * Get your key at: https://aistudio.google.com/app/apikey
 *
 * WARNING: This key will be visible in the client code. For production,
 * use Firebase Cloud Functions to keep the API key secure.
 */
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";

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
let recentMoviesUnsubscribe = null; // Firestore listener unsubscribe function
let allMovies = [];   // Cache of all movie data for the details modal

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
// GEMINI API FUNCTIONS
// ============================================================================

/**
 * Makes a call to the Google Gemini API
 * Includes retry logic with exponential backoff for reliability
 *
 * @param {string} userQuery - The user's prompt/question
 * @param {string} systemPrompt - System instructions to guide the AI's behavior
 * @param {object} jsonSchema - The expected JSON response structure
 * @returns {Promise<object>} The parsed JSON response from Gemini
 * @throws {Error} If the API call fails after all retries
 */
async function makeApiCall(userQuery, systemPrompt, jsonSchema) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: jsonSchema
        }
    };

    let response;
    let retries = 3;
    let delay = 1000; // Start with 1 second delay

    // Retry loop with exponential backoff
    while (retries > 0) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Extract and parse the JSON response
            if (result.candidates && result.candidates[0].content?.parts?.[0]?.text) {
                const jsonText = result.candidates[0].content.parts[0].text;
                return JSON.parse(jsonText);
            } else {
                throw new Error("Invalid API response structure.");
            }

        } catch (error) {
            console.error("API Call Error:", error.message);
            retries--;
            if (retries === 0) {
                throw new Error("API call failed after several retries.");
            }
            // Wait before retrying, with exponential backoff
            await new Promise(res => setTimeout(res, delay));
            delay *= 2;
        }
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
 * Loads recent movies from Firestore and displays them in real-time
 * Sets up a snapshot listener that updates the UI whenever movies are added/changed
 * Movies are sorted by creation date (newest first) and limited to 20 entries
 */
function loadRecentMovies() {
    // Detach previous listener if it exists
    if (recentMoviesUnsubscribe) {
        recentMoviesUnsubscribe();
    }

    const moviesCollection = collection(db, `/artifacts/${appId}/public/data/movies`);
    const q = query(moviesCollection);

    const listEl = document.getElementById('recent-movies-list');

    // Set up real-time snapshot listener
    recentMoviesUnsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            listEl.innerHTML = "<li>No movies cast yet. Be the first!</li>";
            return;
        }

        allMovies = []; // Clear movie cache
        let movies = [];

        // Extract all movie documents
        snapshot.forEach(doc => {
            movies.push({ id: doc.id, ...doc.data() });
        });

        // Sort by creation date (newest first)
        movies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        allMovies = movies; // Store for detail modal

        listEl.innerHTML = ""; // Clear list

        // Display top 20 movies
        movies.slice(0, 20).forEach((movie, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${movie.bookName}</strong> (Box: ${formatCurrency(movie.boxOffice)})`;
            li.dataset.index = index;
            li.title = "Click to see details";
            listEl.appendChild(li);
        });

    }, (error) => {
        console.error("Error loading recent movies: ", error);
        listEl.innerHTML = "<li>Error loading movie list.</li>";
    });
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
    } catch (error) {
        console.error("Error saving movie: ", error);
        showModal("Error: Could not save movie results to database. Check console.");
    }
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

    // Call Gemini API to estimate actor's fee
    try {
        const result = await makeApiCall(
            ACTOR_FEE_PROMPT.getUserQuery(actorName),
            ACTOR_FEE_PROMPT.systemPrompt,
            ACTOR_FEE_PROMPT.schema
        );

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
        // Call Gemini API to analyze the book
        const result = await makeApiCall(
            BOOK_INFO_PROMPT.getUserQuery(state.bookName, state.author),
            BOOK_INFO_PROMPT.systemPrompt,
            BOOK_INFO_PROMPT.schema
        );

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
 * Screen 1: Recent Movies List Click Handler
 * Shows detailed information about a clicked movie in a modal
 */
document.getElementById('recent-movies-list').addEventListener('click', (event) => {
    if (event.target.tagName === 'LI') {
        const index = event.target.dataset.index;
        if (index === undefined || !allMovies[index]) return;

        const movie = allMovies[index];

        // Format cast list for display
        let castHtml = movie.castList
            .map(c => `<li>${c.character}: <strong>${c.actor}</strong> (${formatCurrency(c.fee)})</li>`)
            .join('');

        // Format awards list for display
        let awardsHtml = movie.awards.length > 0
            ? movie.awards.map(a => `<li>${a}</li>`).join('')
            : "<li>None</li>";

        // Build detailed HTML for modal
        const detailsHtml = `
            <p><strong>Book:</strong> ${movie.bookName}</p>
            <p><strong>Director ID:</strong> ${movie.directorId.substring(0, 8)}...</p>
            <p><strong>Box Office:</strong> ${formatCurrency(movie.boxOffice)}</p>
            <hr>
            <h4>Cast:</h4>
            <ul>${castHtml}</ul>
            <hr>
            <h4>Awards:</h4>
            <ul>${awardsHtml}</ul>
            <hr>
            <p><strong>Review:</strong> ${movie.summary}</p>
        `;

        showModal(detailsHtml, `Details: ${movie.bookName}`, false);
    }
});

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
        // Call Gemini API to generate movie results
        const results = await makeApiCall(
            MOVIE_RESULTS_PROMPT.getUserQuery(
                state.bookName,
                state.bookInfo.popularity,
                formatCurrency(state.movieBudget),
                formatCurrency(state.castingBudget),
                formatCurrency(state.spentBudget),
                wentOverBudget,
                castDetails
            ),
            MOVIE_RESULTS_PROMPT.systemPrompt,
            MOVIE_RESULTS_PROMPT.schema
        );

        // Save results to Firebase before showing final screen
        await saveMovieToFirebase(results);

        populateScreen4(results);
        showScreen('screen4');

    } catch (error) {
        console.error("Failed to make movie:", error);
        showModal("Error: The studio computers crashed while making the movie. Check console.");
    } finally {
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
    showLoading(false);
    showScreen('screen1'); // Start on the book entry screen
});
