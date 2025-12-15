/**
 * Welcome Screen
 * Handles the intro sequence and welcome screen animations
 */

import { getWelcomeScreen } from '../config/constants.js';
import { showLoading } from './screenManager.js';

// Intro Sequence State
let currentPhase = 1;
let introTimeouts = [];
let typingInterval = null;
let dotsInterval = null;
let loadingBarInterval = null;

/**
 * Clear all intro timeouts and intervals
 */
export function clearIntroTimers() {
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
 * @param {number} phaseNumber - Phase number (1-5)
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
export function skipToEnd() {
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
 * Shows the welcome screen and starts the intro sequence
 * Always shows on every visit (no localStorage check)
 * @returns {boolean} True
 */
export function showWelcomeScreen() {
    const welcomeScreen = getWelcomeScreen();
    welcomeScreen.classList.add('active');
    runIntroSequence();
    return true;
}

/**
 * Hides the welcome screen after intro completes
 * Shows loading overlay while the app initializes
 */
export function hideWelcomeScreen() {
    const welcomeScreen = getWelcomeScreen();
    welcomeScreen.classList.remove('active');
    showLoading(true);

    // Give a brief moment for the welcome screen to fade out
    setTimeout(() => {
        showLoading(false);
    }, 500);
}

/**
 * Get current phase number
 * @returns {number} Current phase (1-5)
 */
export function getCurrentPhase() {
    return currentPhase;
}

/**
 * Initialize welcome screen event listeners
 */
export function initWelcomeScreen() {
    // Boot button
    const bootButton = document.getElementById('boot-system');
    if (bootButton) {
        bootButton.addEventListener('click', () => {
            clearIntroTimers();
            hideWelcomeScreen();
        });
    }

    // Skip button
    const skipButton = document.getElementById('skip-intro');
    if (skipButton) {
        skipButton.addEventListener('click', skipToEnd);
    }

    // Enter key support (only from phase 5)
    document.addEventListener('keydown', (e) => {
        const welcomeScreen = getWelcomeScreen();
        if (e.key === 'Enter' && welcomeScreen.classList.contains('active') && currentPhase === 5) {
            clearIntroTimers();
            hideWelcomeScreen();
        }
    });
}
