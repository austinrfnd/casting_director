/**
 * Screen 2 - Budget Reveal Screen
 * Displays budget information and studio assignment
 */

import { getState } from '../services/stateService.js';
import { formatCurrency } from '../utils/formatters.js';
import { showScreen } from './screenManager.js';
import { populateScreen3 } from './screen3.js';

/**
 * Populate Screen 2 with budget information
 */
export function populateScreen2() {
    const state = getState();

    document.getElementById('project-title').textContent = state.bookName;
    document.getElementById('movie-budget').textContent = formatCurrency(state.bookInfo.movieBudget);
    document.getElementById('casting-budget').textContent = formatCurrency(state.bookInfo.castingBudget);
    document.getElementById('studio-name').textContent = state.bookInfo.studio;
    document.getElementById('budget-reason').textContent = state.bookInfo.budgetReasoning;
}

/**
 * Initialize screen2 event listeners
 */
export function initScreen2() {
    const castingButton = document.getElementById('go-to-casting');
    if (castingButton) {
        castingButton.addEventListener('click', () => {
            populateScreen3();
            showScreen('screen3');
        });
    }

    const backButton = document.getElementById('back-to-main');
    if (backButton) {
        backButton.addEventListener('click', () => showScreen('screen1'));
    }
}
