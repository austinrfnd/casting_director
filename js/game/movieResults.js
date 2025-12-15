/**
 * Movie Results
 * Processes and formats movie results for display
 */

/**
 * Calculate profit/loss from movie
 * @param {number} boxOffice - Box office revenue
 * @param {number} budget - Movie budget
 * @returns {number} Profit (positive) or loss (negative)
 */
export function calculateProfit(boxOffice, budget) {
    return boxOffice - budget;
}

/**
 * Determine if movie was profitable
 * @param {number} boxOffice - Box office revenue
 * @param {number} budget - Movie budget
 * @returns {boolean} True if profitable
 */
export function isProfitable(boxOffice, budget) {
    return boxOffice >= budget;
}

/**
 * Get profit color for display
 * @param {number} profit - Profit amount
 * @returns {string} CSS color value
 */
export function getProfitColor(profit) {
    return profit >= 0 ? 'var(--dos-green)' : 'var(--dos-error)';
}

/**
 * Process movie results for display
 * Combines results with calculated values
 * @param {object} results - Raw results from API
 * @param {number} movieBudget - Movie budget
 * @returns {object} Processed results with additional computed fields
 */
export function processMovieResults(results, movieBudget) {
    const profit = calculateProfit(results.boxOffice, movieBudget);

    return {
        ...results,
        profit,
        profitColor: getProfitColor(profit),
        isProfitable: isProfitable(results.boxOffice, movieBudget)
    };
}

/**
 * Determine final verdict display
 * @param {string} finalVerdict - The verdict string
 * @returns {object} Object with text, className for display
 */
export function getVerdictDisplay(finalVerdict) {
    switch (finalVerdict) {
        case 'recommended':
            return {
                text: '✅ RECOMMENDED',
                className: 'final-verdict-box verdict-positive'
            };
        case 'not_recommended':
            return {
                text: '❌ NOT RECOMMENDED',
                className: 'final-verdict-box verdict-negative'
            };
        default:
            return {
                text: '⚠️ MIXED RECEPTION',
                className: 'final-verdict-box verdict-mixed'
            };
    }
}
