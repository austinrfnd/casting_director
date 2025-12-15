/**
 * DOM Constants
 * Lazy-initialized DOM element references to avoid timing issues
 */

// Lazy-initialized DOM references
let _screens = null;
let _loadingOverlay = null;
let _dosModal = null;
let _dosModalHeader = null;
let _dosModalContent = null;
let _welcomeScreen = null;

/**
 * Initialize DOM references
 * Call this after DOMContentLoaded to cache DOM element references
 */
export function initConstants() {
    _screens = {
        screen1: document.getElementById('screen1'),
        screen1_5: document.getElementById('screen1_5'),
        screen2: document.getElementById('screen2'),
        screen3: document.getElementById('screen3'),
        screen3_5: document.getElementById('screen3_5'),
        screen4: document.getElementById('screen4'),
        screen5: document.getElementById('screen5')
    };

    _loadingOverlay = document.getElementById('loading-overlay');
    _dosModal = document.getElementById('dos-modal');
    _dosModalHeader = document.getElementById('dos-modal-header');
    _dosModalContent = document.getElementById('dos-modal-content');
    _welcomeScreen = document.getElementById('welcome-screen');
}

/**
 * Getters for DOM references
 * These ensure constants are initialized before use
 */

export function getScreens() {
    if (!_screens) {
        throw new Error('Constants not initialized. Call initConstants() first.');
    }
    return _screens;
}

export function getLoadingOverlay() {
    if (!_loadingOverlay) {
        throw new Error('Constants not initialized. Call initConstants() first.');
    }
    return _loadingOverlay;
}

export function getDosModal() {
    if (!_dosModal) {
        throw new Error('Constants not initialized. Call initConstants() first.');
    }
    return _dosModal;
}

export function getDosModalHeader() {
    if (!_dosModalHeader) {
        throw new Error('Constants not initialized. Call initConstants() first.');
    }
    return _dosModalHeader;
}

export function getDosModalContent() {
    if (!_dosModalContent) {
        throw new Error('Constants not initialized. Call initConstants() first.');
    }
    return _dosModalContent;
}

export function getWelcomeScreen() {
    if (!_welcomeScreen) {
        throw new Error('Constants not initialized. Call initConstants() first.');
    }
    return _welcomeScreen;
}
