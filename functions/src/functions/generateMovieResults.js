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

const geminiApiKey = defineSecret('GEMINI_API_KEY');

/**
 * System prompt for movie results generation
 */
const SYSTEM_PROMPT = 'You are a fun, snarky 90s movie critic. Respond with ONLY a valid JSON object. Do not add markdown.';

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
  },
  required: ['boxOffice', 'awards', 'summary'],
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
 * @returns {Promise<{boxOffice: number, awards: string[], summary: string}>} Movie results
 */
async function generateResults(apiKey, movieData) {
  console.log('generateMovieResults called for book:', movieData.bookName);
  console.log('Calling Gemini API for movie results...');

  const userQuery = buildMovieResultsQuery(movieData);
  const result = await callGeminiProAPI(apiKey, userQuery, SYSTEM_PROMPT, MOVIE_RESULTS_SCHEMA);

  console.log('Successfully generated movie results');
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
