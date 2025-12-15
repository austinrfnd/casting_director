/**
 * Casting Logic
 * Handles actor casting, budget tracking, and cast management
 */

import { getState, getBookInfo, getCastList, getCastingBudget, updateCastMember, updateSpentBudget } from '../services/stateService.js';
import { callGetActorFee } from '../services/apiService.js';
import { showLoading } from '../ui/screenManager.js';
import { showModal } from '../ui/modalManager.js';
import { formatCurrency } from '../utils/formatters.js';

/**
 * Calculate total spent budget from cast list
 * @returns {number} Total amount spent on cast
 */
export function calculateSpentBudget() {
    const castList = getCastList();
    return castList.reduce((acc, actor) => {
        return acc + (actor ? actor.fee : 0);
    }, 0);
}

/**
 * Check if over budget
 * @returns {boolean} True if spent exceeds casting budget
 */
export function isOverBudget() {
    const spent = calculateSpentBudget();
    const budget = getCastingBudget();
    return spent > budget;
}

/**
 * Check if all roles are cast
 * @returns {boolean} True if all characters have been cast
 */
export function allRolesCast() {
    const castList = getCastList();
    return castList.length > 0 && castList.every(actor => actor !== null);
}

/**
 * Handle casting a named actor for a character
 * Makes an API call to estimate the actor's fee, then updates state and UI
 *
 * @param {number} index - The character index in the cast list
 * @param {string} actorName - The name of the actor to cast
 * @returns {Promise<object>} The cast data object
 */
export async function handleCastActor(index, actorName) {
    const bookInfo = getBookInfo();

    if (!actorName) {
        showModal("Please enter an actor's name.");
        return null;
    }

    showLoading(true);

    let fee = 0;
    let popularity = "Unknown";

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

    // Create cast data
    const castData = {
        character: bookInfo.characters[index].name,
        actor: actorName,
        fee: fee,
        popularity: popularity
    };

    // Update state
    updateCastMember(index, castData);

    // Update spent budget in state
    updateSpentBudget(calculateSpentBudget());

    return castData;
}

/**
 * Cast a "No-Name" actor for a character
 * Uses a fixed fee of $100,000 and doesn't require an API call
 *
 * @param {number} index - The character index in the cast list
 * @returns {object} The cast data object
 */
export function castNoNameActor(index) {
    const bookInfo = getBookInfo();
    const fee = 100000;
    const popularity = "No-Name";
    const finalActorName = `Unknown Actor (${bookInfo.characters[index].name})`;

    // Create cast data
    const castData = {
        character: bookInfo.characters[index].name,
        actor: finalActorName,
        fee: fee,
        popularity: popularity
    };

    // Update state
    updateCastMember(index, castData);

    // Update spent budget in state
    updateSpentBudget(calculateSpentBudget());

    return castData;
}

/**
 * Clear the cast for a character
 * @param {number} index - The character index to clear
 */
export function clearCast(index) {
    // Update state
    updateCastMember(index, null);

    // Update spent budget in state
    updateSpentBudget(calculateSpentBudget());
}

/**
 * Update the UI display for cast info
 * @param {number} index - The character index
 * @param {object|null} castData - The cast data or null to clear
 */
export function updateCastInfoDisplay(index, castData) {
    const castInfoDisplay = document.getElementById(`cast-info-${index}`);
    const actorNameInput = document.getElementById(`actor-name-${index}`);
    const castButton = document.querySelector(`.cast-button[data-index="${index}"]`);
    const noNameCheckbox = document.getElementById(`no-name-${index}`);

    if (castData) {
        // Show cast info
        castInfoDisplay.innerHTML =
            `CAST: ${castData.actor} (${formatCurrency(castData.fee)}) <button class="recast-button" data-index="${index}">[X]</button>`;

        // Disable controls
        if (actorNameInput) actorNameInput.disabled = true;
        if (castButton) castButton.disabled = true;
        if (noNameCheckbox) noNameCheckbox.disabled = true;
    } else {
        // Clear cast info and re-enable controls
        castInfoDisplay.innerHTML = "";
        if (actorNameInput) {
            actorNameInput.disabled = false;
            actorNameInput.value = "";
        }
        if (castButton) castButton.disabled = false;
        if (noNameCheckbox) {
            noNameCheckbox.disabled = false;
            noNameCheckbox.checked = false;
        }
    }
}

/**
 * Update the spent budget display in the UI
 */
export function updateSpentBudgetDisplay() {
    const spent = calculateSpentBudget();
    const budget = getCastingBudget();
    const spentDisplay = document.getElementById('spent-casting-budget');

    if (spentDisplay) {
        spentDisplay.textContent = formatCurrency(spent);

        // Highlight in red if over budget
        if (spent > budget) {
            spentDisplay.classList.add('budget-over');
        } else {
            spentDisplay.classList.remove('budget-over');
        }
    }
}
