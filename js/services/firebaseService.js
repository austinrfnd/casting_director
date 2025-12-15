/**
 * Firebase Service
 * Handles Firebase initialization, authentication, and database operations
 */

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
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { firebaseConfig, appId, initialAuthToken } from '../config/firebase.js';
import { setFirebaseInstances, getState, getUserId, getDb } from './stateService.js';
import { initFirestoreFunctions } from './apiService.js';
import { formatCurrency } from '../utils/formatters.js';

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes Firebase and sets up authentication
 * Connects to Firestore and signs in the user (anonymously by default)
 *
 * @param {function} onAuthSuccess - Callback when authentication succeeds
 * @returns {Promise<User>} The authenticated Firebase user
 */
export async function initFirebase(onAuthSuccess) {
    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        setLogLevel('Debug'); // Enable Firestore debug logging

        // Initialize Firestore functions for apiService
        initFirestoreFunctions({ doc, getDoc, setDoc, serverTimestamp });

        // Listen for authentication state changes
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    console.log("User is signed in:", user.uid);

                    // Store Firebase instances in state
                    setFirebaseInstances(app, db, auth, user.uid);

                    // Update UI with user ID
                    const userIdDisplay = document.getElementById('user-id-display');
                    if (userIdDisplay) {
                        userIdDisplay.textContent = `Director ID: ${user.uid.substring(0, 8)}...`;
                    }

                    // Call success callback
                    if (onAuthSuccess) {
                        await onAuthSuccess(user);
                    }

                    resolve(user);
                } else {
                    console.log("User is not signed in, attempting anonymous sign-in.");
                    // No user, initiate sign-in
                    signIn(auth);
                }
            });
        });

    } catch (error) {
        console.error("Firebase Init Error:", error);
        throw error;
    }
}

/**
 * Signs in the user to Firebase
 * Uses custom token if provided, otherwise uses anonymous authentication
 * @param {object} auth - Firebase auth instance
 */
async function signIn(auth) {
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
        throw error;
    }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Saves a completed movie to Firestore
 * Stores all movie data including cast, budget, box office results, and awards
 *
 * @param {object} results - The movie results from the Gemini API (boxOffice, awards, summary)
 * @returns {Promise<string>} The document ID of the saved movie
 */
export async function saveMovie(results) {
    const db = getDb();
    const userId = getUserId();
    const state = getState();

    if (!db || !userId) {
        throw new Error("Not connected to Firebase. Cannot save movie.");
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
        return docRef.id;
    } catch (error) {
        console.error("Error saving movie: ", error);
        throw error;
    }
}

/**
 * Loads recent movies from Firestore
 * Fetches the 10 most recent movies ordered by creation date
 *
 * @returns {Promise<Array>} Array of movie objects with ids
 */
export async function loadRecentMovies() {
    const db = getDb();

    if (!db) {
        console.warn("Database not connected. Cannot load recent movies.");
        return [];
    }

    try {
        const moviesCollection = collection(db, `/artifacts/${appId}/public/data/movies`);
        const q = query(moviesCollection, orderBy('createdAt', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return [];
        }

        const movies = [];
        querySnapshot.forEach((docSnapshot) => {
            movies.push({ id: docSnapshot.id, ...docSnapshot.data() });
        });

        return movies;
    } catch (error) {
        console.error("Error loading recent movies:", error);
        throw error;
    }
}

/**
 * Gets a single movie by ID
 * @param {string} movieId - The Firestore document ID of the movie
 * @returns {Promise<object|null>} The movie data or null if not found
 */
export async function getMovieById(movieId) {
    const db = getDb();

    if (!db) {
        throw new Error("Database not connected.");
    }

    try {
        const movieRef = doc(db, `/artifacts/${appId}/public/data/movies`, movieId);
        const movieSnap = await getDoc(movieRef);

        if (!movieSnap.exists()) {
            return null;
        }

        return { id: movieSnap.id, ...movieSnap.data() };
    } catch (error) {
        console.error("Error loading movie details:", error);
        throw error;
    }
}

/**
 * Displays recent movies in the list element
 * @param {Array} movies - Array of movie objects
 * @param {HTMLElement} listElement - The UL element to populate
 * @param {function} onMovieClick - Callback when a movie is clicked
 */
export function displayRecentMovies(movies, listElement, onMovieClick) {
    if (!movies || movies.length === 0) {
        listElement.innerHTML = '<li>No movies cast yet. Be the first!</li>';
        return;
    }

    listElement.innerHTML = movies.map(movie => {
        const boxOffice = formatCurrency(movie.boxOffice || 0);
        const directorShort = movie.directorId ? movie.directorId.substring(0, 8) : 'unknown';

        return `<li data-movie-id="${movie.id}">
            <strong>${movie.bookName}</strong> by ${movie.author}<br>
            Director: ${directorShort} | Box Office: ${boxOffice}
        </li>`;
    }).join('');

    // Add click handlers
    if (onMovieClick) {
        listElement.querySelectorAll('li[data-movie-id]').forEach(li => {
            li.addEventListener('click', () => {
                onMovieClick(li.dataset.movieId);
            });
        });
    }
}
