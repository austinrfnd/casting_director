/**
 * Login Screen Module
 * Handles the pre-authentication login screen with Google Sign-In and Guest options
 */

import {
    getAuth,
    signInAnonymously,
    signInWithPopup,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// ============================================================================
// STATE
// ============================================================================

let loginScreenElement = null;
let googleSignInBtn = null;
let guestSignInBtn = null;
let onLoginCallback = null;

// ============================================================================
// UI FUNCTIONS
// ============================================================================

/**
 * Shows the login screen
 */
export function showLoginScreen() {
    if (loginScreenElement) {
        loginScreenElement.classList.add('active');
    }
}

/**
 * Hides the login screen
 */
export function hideLoginScreen() {
    if (loginScreenElement) {
        loginScreenElement.classList.remove('active');
    }
}

/**
 * Shows a loading state on a button
 * @param {HTMLElement} button - The button element
 * @param {boolean} loading - Whether to show loading state
 */
function setButtonLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

/**
 * Shows an error message on the login screen
 * @param {string} message - The error message to display
 */
function showLoginError(message) {
    let errorElement = document.querySelector('.login-error');

    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'login-error';
        const loginBox = document.querySelector('.login-box');
        if (loginBox) {
            loginBox.appendChild(errorElement);
        }
    }

    errorElement.textContent = message;
    errorElement.classList.add('visible');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorElement.classList.remove('visible');
    }, 5000);
}

// ============================================================================
// AUTHENTICATION HANDLERS
// ============================================================================

/**
 * Handles Google Sign-In
 * @param {object} auth - Firebase Auth instance
 */
async function handleGoogleSignIn(auth) {
    setButtonLoading(googleSignInBtn, true);
    setButtonLoading(guestSignInBtn, true);

    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        console.log('Google sign-in successful:', result.user.displayName);
        // Auth state change will handle the rest
    } catch (error) {
        console.error('Google sign-in error:', error);

        let errorMessage = 'Sign-in failed. Please try again.';

        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Sign-in cancelled.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Popup blocked. Please allow popups for this site.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Check your connection.';
        }

        showLoginError(errorMessage);
        setButtonLoading(googleSignInBtn, false);
        setButtonLoading(guestSignInBtn, false);
    }
}

/**
 * Handles Guest Sign-In (anonymous authentication)
 * @param {object} auth - Firebase Auth instance
 */
async function handleGuestSignIn(auth) {
    setButtonLoading(googleSignInBtn, true);
    setButtonLoading(guestSignInBtn, true);

    try {
        await signInAnonymously(auth);
        console.log('Guest sign-in successful');
        // Auth state change will handle the rest
    } catch (error) {
        console.error('Guest sign-in error:', error);
        showLoginError('Could not sign in as guest. Please try again.');
        setButtonLoading(googleSignInBtn, false);
        setButtonLoading(guestSignInBtn, false);
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the login screen
 * Sets up event listeners and stores references
 * @param {object} auth - Firebase Auth instance
 * @param {function} onLogin - Callback when login is complete
 */
export function initLoginScreen(auth, onLogin) {
    loginScreenElement = document.getElementById('login-screen');
    googleSignInBtn = document.getElementById('google-signin-btn');
    guestSignInBtn = document.getElementById('guest-signin-btn');
    onLoginCallback = onLogin;

    if (!loginScreenElement) {
        console.warn('Login screen element not found');
        return;
    }

    // Google Sign-In button
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', () => handleGoogleSignIn(auth));
    }

    // Guest Sign-In button
    if (guestSignInBtn) {
        guestSignInBtn.addEventListener('click', () => handleGuestSignIn(auth));
    }

    console.log('Login screen initialized');
}

/**
 * Checks if user is already authenticated
 * @returns {boolean} True if login screen should be shown
 */
export function shouldShowLoginScreen() {
    // Always show login screen unless we're deep linking
    return true;
}
