/**
 * State Service
 * Centralized state management with controlled access
 * Single source of truth for application state
 */

/**
 * Application State
 * Tracks the current project and user selections throughout the game flow
 */
const state = {
    // Book and project info
    bookName: "",
    author: "",
    bookInfo: null,  // Book data from API (popularity, synopsis, characters, budgets, etc.)

    // Budget info
    movieBudget: 0,
    castingBudget: 0,
    spentBudget: 0,

    // Cast info
    castList: [],  // Array of cast objects: {character, actor, fee, popularity}

    // Firebase instances
    firebase: {
        app: null,
        db: null,
        auth: null,
        userId: null
    }
};

// ============================================================================
// GETTERS
// ============================================================================

/**
 * Get the entire state object (read-only reference)
 * @returns {object} The state object
 */
export function getState() {
    return state;
}

/**
 * Get book name
 * @returns {string}
 */
export function getBookName() {
    return state.bookName;
}

/**
 * Get author name
 * @returns {string}
 */
export function getAuthor() {
    return state.author;
}

/**
 * Get book info
 * @returns {object|null}
 */
export function getBookInfo() {
    return state.bookInfo;
}

/**
 * Get movie budget
 * @returns {number}
 */
export function getMovieBudget() {
    return state.movieBudget;
}

/**
 * Get casting budget
 * @returns {number}
 */
export function getCastingBudget() {
    return state.castingBudget;
}

/**
 * Get spent budget
 * @returns {number}
 */
export function getSpentBudget() {
    return state.spentBudget;
}

/**
 * Get cast list
 * @returns {Array}
 */
export function getCastList() {
    return state.castList;
}

/**
 * Get Firebase database instance
 * @returns {object|null}
 */
export function getDb() {
    return state.firebase.db;
}

/**
 * Get Firebase auth instance
 * @returns {object|null}
 */
export function getAuth() {
    return state.firebase.auth;
}

/**
 * Get current user ID
 * @returns {string|null}
 */
export function getUserId() {
    return state.firebase.userId;
}

/**
 * Get Firebase app instance
 * @returns {object|null}
 */
export function getApp() {
    return state.firebase.app;
}

// ============================================================================
// SETTERS
// ============================================================================

/**
 * Update book information and initialize cast list
 * @param {string} bookName - The book title
 * @param {string} author - The author name
 * @param {object} bookInfo - Book info from API
 */
export function updateBookInfo(bookName, author, bookInfo) {
    state.bookName = bookName;
    state.author = author;
    state.bookInfo = bookInfo;

    // Initialize cast list with null entries for each character
    if (bookInfo && bookInfo.characters) {
        state.castList = new Array(bookInfo.characters.length).fill(null);
    }
}

/**
 * Update budget values
 * @param {number} movieBudget - Total movie production budget
 * @param {number} castingBudget - Budget allocated for actors
 */
export function updateBudgets(movieBudget, castingBudget) {
    state.movieBudget = movieBudget;
    state.castingBudget = castingBudget;
}

/**
 * Update a single cast member
 * @param {number} index - Index in the cast list
 * @param {object|null} castData - Cast member data {character, actor, fee, popularity} or null to clear
 */
export function updateCastMember(index, castData) {
    if (index < 0 || index >= state.castList.length) {
        throw new Error(`Invalid cast index: ${index}`);
    }
    state.castList[index] = castData;
}

/**
 * Update spent budget (calculated from cast list)
 * @param {number} spentBudget - Total amount spent on cast
 */
export function updateSpentBudget(spentBudget) {
    state.spentBudget = spentBudget;
}

/**
 * Set Firebase instances
 * @param {object} app - Firebase app instance
 * @param {object} db - Firestore database instance
 * @param {object} auth - Firebase auth instance
 * @param {string} userId - Current user ID
 */
export function setFirebaseInstances(app, db, auth, userId) {
    state.firebase.app = app;
    state.firebase.db = db;
    state.firebase.auth = auth;
    state.firebase.userId = userId;
}

/**
 * Reset state to initial values
 * Useful for testing and starting a new project
 */
export function resetState() {
    state.bookName = "";
    state.author = "";
    state.bookInfo = null;
    state.movieBudget = 0;
    state.castingBudget = 0;
    state.spentBudget = 0;
    state.castList = [];
    // Note: Firebase instances are not reset
}
