/**
 * Generate Movie Results Cloud Function
 *
 * Generates hypothetical box office performance, awards, and critical reception
 * for a book-to-film adaptation based on cast, budget, and book popularity.
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { callGeminiProAPI } = require('../services/geminiClient');
const { validateRequiredParams, sendError } = require('../utils/helpers');
const { getRandomUsername } = require('../config/usernames');

const geminiApiKey = defineSecret('GEMINI_API_KEY');

/**
 * System prompt for movie results generation
 */
const SYSTEM_PROMPT = `You are an expert movie analyst generating comprehensive review data across multiple platforms.

Generate realistic, platform-specific reviews that match each platform's culture:

IMDB REVIEW (imdbScore, imdbReview):
- Score: 0-10 with decimal (e.g., 8.3)
- Style: Technical, detailed, 2-3 sentences
- Focus: Cinematography, editing, sound design, performances
- Tone: Professional amateur critic

LETTERBOXD REVIEW (letterboxdScore, letterboxdReview):
- Score: 0-5 with half-stars (e.g., 4.5)
- Style: Artsy, quirky, emotional, 1-2 sentences
- Use lowercase aesthetic when appropriate
- Tone: Personal, poetic, sometimes absurdist

ROTTEN TOMATOES (rtCriticsScore, rtAudienceScore, rtReview):
- Critics Score: 0-100 percentage
- Audience Score: 0-100 percentage (can differ from critics!)
- Style: Mainstream, accessible, 2-3 sentences
- Focus: Entertainment value, worth the price
- Tone: Practical recommendations

OVERALL GAME SCORE (overallGameScore, scoreDescriptor):
Calculate a fair 0-100 score based on:
- Box Office Performance (30%): Revenue vs budget, profit margin
- Critical Reception (25%): Average of IMDB (×10), Letterboxd (×20), RT Critics
- Awards (20%): Major awards = big bonus, Razzies = penalty
- Cast Quality (15%): Popularity and fit
- Budget Management (10%): Under budget = bonus, over = penalty

SCORE DISTRIBUTION (make 95+ EXTREMELY rare):
- 98-100: Once-in-generation (perfect storm)
- 95-97: Instant classic (very rare)
- 90-94: Awards frontrunner
- 85-89: Critical darling
- 80-84: Crowd-pleaser
- 70-79: Solid hit
- 60-69: Mixed reception
- 50-59: Missed the mark
- 40-49: Disappointment
- 30-39: Critical failure
- 20-29: Disaster
- 0-19: Legendary catastrophe

Match the scoreDescriptor to the score range exactly.

SISKEL & EBERT VERDICT (siskelReview, siskelVerdict, ebertReview, ebertVerdict, finalVerdict):
- Two distinct critic voices debating the film
- Sometimes agree, sometimes disagree
- Focus on different aspects (story vs execution, art vs entertainment)
- Each gives 2-3 sentence review
- Each gives "thumbs_up" or "thumbs_down"
- finalVerdict: "recommended" if mostly positive, "not_recommended" if mostly negative, "mixed" if split

TONE FOR BAD MOVIES (scores below 50):
- Be funny-harsh, not mean
- Snarky, entertaining roasting
- "So bad it's legendary" for disasters
- Memorable, quotable criticism

CASTING SCORES (castingScores):
For each of the 4 cast members, generate a casting score (0-10):
1. Internally determine the top 5 ideal actors for this specific character (considering age, acting style, genre fit, star power)
2. Compare the user's pick to those top 5 ideal actors
3. Calculate score based on "degree of difference":
   - 10/10: User picked one of top 5 or nearly identical fit
   - 8-9/10: Excellent choice, very close to ideal
   - 7/10: Good choice, solid pick
   - 5-6/10: Decent but not ideal
   - 3-4/10: Poor fit, miscast
   - 1-2/10: Terrible choice, complete mismatch

SPECIAL RULES FOR NO-NAME ACTORS:
- No-name actors can score 8-10/10 for MINOR/FORGETTABLE characters
- No-name actors score 2-4/10 for LEAD characters (need star power)
- No-name actors score 4-6/10 for SUPPORTING characters

CHARACTER IMPORTANCE:
- Assess each character's importance from the character description
- Lead characters: strict scoring, need star power
- Supporting: more flexibility
- Minor: no-names can excel (smart budget choice)

BUDGET CONSCIOUSNESS:
- A-list stars in minor roles = lower scores (wasted budget)
- No-names in minor roles = higher scores (smart choice)

For each casting score, provide:
- character: Character name
- actor: Actor name (as cast by user)
- score: 0-10 numeric score
- reasoning: One sentence explaining the score

NEVER reveal the top 5 ideal actors list to the user - keep it internal to your analysis.

BOX OFFICE:
Generate realistic box office revenue considering all factors.

AWARDS:
Generate appropriate awards (Oscars, Golden Globes, Razzies, etc.)
Can include negative awards for bad movies!

Respond with ONLY a valid JSON object. Do not add markdown.`;

/**
 * JSON schema for movie results response
 */
const MOVIE_RESULTS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    boxOffice: {
      type: 'NUMBER',
      description: 'Total box office gross as a number',
    },
    awards: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: "List of awards, e.g., 'Best Actor (Oscar)', 'Worst Director (Razzie)'",
    },
    summary: {
      type: 'STRING',
      description: "A 1-2 paragraph fun, snarky summary of the movie's release and reception.",
    },
    // IMDB Review
    imdbScore: {
      type: 'NUMBER',
      description: 'IMDB score from 0-10 with decimal (e.g., 8.3)',
    },
    imdbReview: {
      type: 'STRING',
      description: 'Technical, detailed IMDB-style review (2-3 sentences)',
    },
    // Letterboxd Review
    letterboxdScore: {
      type: 'NUMBER',
      description: 'Letterboxd score from 0-5 with half-stars (e.g., 4.5)',
    },
    letterboxdReview: {
      type: 'STRING',
      description: 'Artsy, quirky, emotional Letterboxd-style review (1-2 sentences, lowercase aesthetic)',
    },
    // Rotten Tomatoes
    rtCriticsScore: {
      type: 'NUMBER',
      description: 'Rotten Tomatoes Critics percentage 0-100',
    },
    rtAudienceScore: {
      type: 'NUMBER',
      description: 'Rotten Tomatoes Audience percentage 0-100',
    },
    rtReview: {
      type: 'STRING',
      description: 'Mainstream, accessible RT-style review (2-3 sentences)',
    },
    // Overall Game Score
    overallGameScore: {
      type: 'NUMBER',
      description: 'Overall game score 0-100 (95+ extremely rare, perfect storm needed)',
    },
    scoreDescriptor: {
      type: 'STRING',
      description: 'Score descriptor (e.g., "Critical Darling", "Masterpiece", "Disaster")',
    },
    // Siskel & Ebert Verdict
    siskelReview: {
      type: 'STRING',
      description: 'Critic A perspective (2-3 sentences)',
    },
    siskelVerdict: {
      type: 'STRING',
      description: 'Critic A verdict: either "thumbs_up" or "thumbs_down"',
    },
    ebertReview: {
      type: 'STRING',
      description: 'Critic B perspective (2-3 sentences)',
    },
    ebertVerdict: {
      type: 'STRING',
      description: 'Critic B verdict: either "thumbs_up" or "thumbs_down"',
    },
    finalVerdict: {
      type: 'STRING',
      description: 'Final recommendation: "recommended", "not_recommended", or "mixed"',
    },
    // Individual Casting Scores
    castingScores: {
      type: 'ARRAY',
      description: 'Array of casting scores (0-10) for each of the 4 characters',
      items: {
        type: 'OBJECT',
        properties: {
          character: { type: 'STRING', description: 'Character name' },
          actor: { type: 'STRING', description: 'Actor name' },
          score: { type: 'NUMBER', description: 'Casting score 0-10' },
          reasoning: { type: 'STRING', description: 'Brief explanation of score (1 sentence)' },
        },
        required: ['character', 'actor', 'score', 'reasoning'],
      },
    },
  },
  required: [
    'boxOffice',
    'awards',
    'summary',
    'imdbScore',
    'imdbReview',
    'letterboxdScore',
    'letterboxdReview',
    'rtCriticsScore',
    'rtAudienceScore',
    'rtReview',
    'overallGameScore',
    'scoreDescriptor',
    'siskelReview',
    'siskelVerdict',
    'ebertReview',
    'ebertVerdict',
    'finalVerdict',
    'castingScores',
  ],
};

/**
 * Builds the user query for movie results generation
 * @param {object} movieData - Movie production data
 * @param {string} movieData.bookName - Name of the book
 * @param {string} movieData.bookPopularity - Popularity level of the book
 * @param {number} movieData.movieBudget - Total movie production budget
 * @param {number} movieData.castingBudget - Allocated casting budget
 * @param {number} movieData.spentBudget - Actual amount spent on cast
 * @param {boolean} movieData.wentOverBudget - Whether casting went over budget
 * @param {string} movieData.castDetails - Formatted string of cast details
 * @returns {string} User query for Gemini API
 */
function buildMovieResultsQuery(movieData) {
  const {
    bookName,
    bookPopularity,
    movieBudget,
    castingBudget,
    spentBudget,
    wentOverBudget,
    castDetails,
  } = movieData;

  return `
                Hypothesize the movie results based on this data. Be fun and lighthearted.
                - Book: ${bookName} (Popularity: ${bookPopularity})
                - Movie Budget: ${movieBudget}
                - Casting Budget: ${castingBudget}
                - Total Spent on Cast: ${spentBudget} (Went Over Budget: ${wentOverBudget})
                - The Cast:
                ${castDetails}

                How well did this movie do? Consider the book's popularity, the cast's fit and popularity, and the budget.
                Respond with this JSON schema.
            `;
}

/**
 * Generates movie results using Gemini Pro API
 * @param {string} apiKey - Gemini API key
 * @param {object} movieData - Movie production data
 * @returns {Promise<object>} Movie results with platform reviews and usernames
 */
async function generateResults(apiKey, movieData) {
  console.log('generateMovieResults called for book:', movieData.bookName);
  console.log('Calling Gemini API for movie results...');

  const userQuery = buildMovieResultsQuery(movieData);
  const result = await callGeminiProAPI(apiKey, userQuery, SYSTEM_PROMPT, MOVIE_RESULTS_SCHEMA);

  // Add random 90s-style usernames for each platform review
  result.imdbUsername = getRandomUsername();
  result.letterboxdUsername = getRandomUsername();
  result.rtUsername = getRandomUsername();

  console.log('Successfully generated movie results with platform reviews');
  console.log('castingScores in response:', JSON.stringify(result.castingScores));
  console.log('castingScores length:', result.castingScores ? result.castingScores.length : 0);
  return result;
}

/**
 * Cloud Function handler for generating movie results
 */
const generateMovieResultsHandler = onRequest(
  {
    secrets: [geminiApiKey],
    cors: true,
    timeoutSeconds: 120, // Increase timeout to 2 minutes for AI processing
  },
  async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      // Validate required parameters
      const validation = validateRequiredParams(req.body, ['bookName', 'bookPopularity', 'castDetails']);

      if (!validation.valid) {
        console.error('Missing required fields:', {
          bookName: req.body.bookName,
          bookPopularity: req.body.bookPopularity,
          castDetails: req.body.castDetails,
        });
        return sendError(res, 400, 'Missing required fields', {
          missing: validation.missing,
        });
      }

      const {
        bookName,
        bookPopularity,
        movieBudget,
        castingBudget,
        spentBudget,
        wentOverBudget,
        castDetails,
      } = req.body;

      // Generate movie results
      const result = await generateResults(geminiApiKey.value(), {
        bookName,
        bookPopularity,
        movieBudget,
        castingBudget,
        spentBudget,
        wentOverBudget,
        castDetails,
      });

      res.json(result);
    } catch (error) {
      console.error('Error in generateMovieResults:', error);
      sendError(res, 500, 'Failed to generate movie results', {
        details: error.message,
      });
    }
  }
);

module.exports = {
  generateMovieResults: generateMovieResultsHandler,
  generateResults, // Export for testing
  buildMovieResultsQuery, // Export for testing
  SYSTEM_PROMPT, // Export for testing
  MOVIE_RESULTS_SCHEMA, // Export for testing
};
