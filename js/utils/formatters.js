/**
 * Formatting Utilities
 * Pure functions for formatting currency, scores, and other display values
 */

/**
 * Formats a number as US currency
 *
 * @param {number} num - The number to format
 * @returns {string} Formatted currency string (e.g., "$1,000,000")
 */
export function formatCurrency(num) {
    if (typeof num !== 'number') return '$0';
    return '$' + num.toLocaleString('en-US');
}

/**
 * Converts Letterboxd score (0-5) to star format with half-stars
 * @param {number} score - Score from 0 to 5
 * @returns {string} Star representation (e.g., "★★★★½")
 */
export function formatLetterboxdStars(score) {
    const fullStars = Math.floor(score);
    const hasHalf = score % 1 >= 0.25 && score % 1 < 0.75;

    let stars = '★'.repeat(fullStars);
    if (hasHalf) stars += '½';

    return stars;
}

/**
 * Generates thumb icon based on Siskel & Ebert verdict
 * @param {string} verdict - Either "thumbs_up" or "thumbs_down"
 * @returns {string} Emoji representation
 */
export function generateThumbIcon(verdict) {
    return verdict === 'thumbs_up' ? '👍' : '👎';
}

/**
 * Gets CSS color class based on overall game score
 * @param {number} score - Score from 0 to 100
 * @returns {string} CSS class name
 */
export function getScoreColorClass(score) {
    if (score >= 90) return 'score-exceptional';
    if (score >= 80) return 'score-great';
    if (score >= 70) return 'score-good';
    if (score >= 60) return 'score-decent';
    if (score >= 50) return 'score-mediocre';
    if (score >= 40) return 'score-poor';
    return 'score-disaster';
}
