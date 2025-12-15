/**
 * Screen 4 - Results Screen
 * Displays movie premiere results
 */

import { getState, getCastList } from '../services/stateService.js';
import { formatCurrency, formatLetterboxdStars, generateThumbIcon } from '../utils/formatters.js';
import { getVerdictDisplay, calculateProfit, getProfitColor } from '../game/movieResults.js';

/**
 * Populate Screen 4 with movie results
 * @param {object} results - Results from generateMovieResults API
 */
export function populateScreen4(results) {
    const state = getState();

    // Basic info
    document.getElementById('final-project-title').textContent = state.bookName;
    document.getElementById('final-budget').textContent = formatCurrency(state.movieBudget);
    document.getElementById('final-box-office').textContent = formatCurrency(results.boxOffice);

    // Profit/loss
    const profit = calculateProfit(results.boxOffice, state.movieBudget);
    const profitElement = document.getElementById('profit-loss');
    profitElement.textContent = `Profit: ${formatCurrency(profit)}`;
    profitElement.style.color = getProfitColor(profit);

    // Overall Game Score
    document.getElementById('overall-score').textContent = results.overallGameScore;
    document.getElementById('score-descriptor').textContent = results.scoreDescriptor;

    // IMDB Review
    document.getElementById('imdb-score').textContent = `${results.imdbScore} / 10`;
    document.getElementById('imdb-review').textContent = results.imdbReview;
    document.getElementById('imdb-username').textContent = `- ${results.imdbUsername}`;

    // Letterboxd Review
    const letterboxdStars = formatLetterboxdStars(results.letterboxdScore);
    document.getElementById('letterboxd-score').textContent = `${letterboxdStars} (${results.letterboxdScore} / 5)`;
    document.getElementById('letterboxd-review').textContent = results.letterboxdReview;
    document.getElementById('letterboxd-username').textContent = `- ${results.letterboxdUsername}`;

    // Rotten Tomatoes Review
    const rtCriticsElement = document.getElementById('rt-critics');
    rtCriticsElement.textContent = `Critics: ${results.rtCriticsScore}%`;
    rtCriticsElement.className = results.rtCriticsScore >= 60 ? 'rt-fresh' : 'rt-rotten';

    const rtAudienceElement = document.getElementById('rt-audience');
    rtAudienceElement.textContent = `Audience: ${results.rtAudienceScore}%`;
    rtAudienceElement.className = results.rtAudienceScore >= 60 ? 'rt-fresh' : 'rt-rotten';

    document.getElementById('rt-review').textContent = results.rtReview;
    document.getElementById('rt-username').textContent = `- ${results.rtUsername}`;

    // Siskel & Ebert Verdict
    document.getElementById('siskel-review').textContent = results.siskelReview;
    document.getElementById('siskel-verdict').textContent = generateThumbIcon(results.siskelVerdict);
    document.getElementById('ebert-review').textContent = results.ebertReview;
    document.getElementById('ebert-verdict').textContent = generateThumbIcon(results.ebertVerdict);

    // Final verdict
    const verdictDisplay = getVerdictDisplay(results.finalVerdict);
    const finalVerdictElement = document.getElementById('final-verdict');
    finalVerdictElement.textContent = verdictDisplay.text;
    finalVerdictElement.className = verdictDisplay.className;

    // Awards
    const awardsList = document.getElementById('final-awards');
    if (results.awards && results.awards.length > 0) {
        awardsList.innerHTML = results.awards.map(award => `<li>• ${award}</li>`).join('');
    } else {
        awardsList.innerHTML = '<li>None. Not even a nomination. Ouch.</li>';
    }

    // Cast list with casting scores
    const castListElement = document.getElementById('final-cast-list');
    const castList = getCastList();

    if (results.castingScores && results.castingScores.length > 0) {
        castListElement.innerHTML = results.castingScores.map((castScore, index) => {
            const scoreEmoji = castScore.score >= 8 ? ' ⭐' : '';
            const actor = castScore.actor || (castList[index] ? castList[index].actor : 'Unknown');
            const character = castScore.character || (castList[index] ? castList[index].character : 'Unknown');
            const score = castScore.score !== undefined ? castScore.score : 0;
            return `<li>${character}: ${actor} - ${score}/10${scoreEmoji}<br/><span style="color: var(--dos-gray); font-size: 14px;">${castScore.reasoning || ''}</span></li>`;
        }).join('');
    } else if (castList && castList.length > 0) {
        castListElement.innerHTML = castList.map(cast =>
            `<li>${cast.character}: ${cast.actor} (${formatCurrency(cast.fee)} - ${cast.popularity})</li>`
        ).join('');
    } else {
        castListElement.innerHTML = '<li>No cast information available.</li>';
    }
}

/**
 * Initialize screen4 event listeners
 */
export function initScreen4() {
    // New project button uses location.reload() in HTML onclick
    // No additional setup needed
}
