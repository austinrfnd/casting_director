/**
 * Screen Manager
 * Handles screen navigation and loading overlay
 */

import { getScreens, getLoadingOverlay } from '../config/constants.js';

/**
 * Switches between application screens
 * Hides all screens and shows only the specified one
 *
 * @param {string} screenId - The ID of the screen to display (e.g., 'screen1')
 */
export function showScreen(screenId) {
    const screens = getScreens();
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
export function showLoading(show) {
    const overlay = getLoadingOverlay();
    overlay.style.display = show ? 'block' : 'none';
}
