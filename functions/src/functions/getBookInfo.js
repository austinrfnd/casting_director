/**
 * Get Book Info Cloud Function
 *
 * Analyzes books for film adaptation potential and calculates realistic
 * production budgets using Google Gemini AI.
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { callGeminiAPI } = require('../services/geminiClient');
const { validateRequiredParams, sendError } = require('../utils/helpers');

const geminiApiKey = defineSecret('GEMINI_API_KEY');

/**
 * System prompt for book analysis
 */
const SYSTEM_PROMPT = `You are a movie production database and expert Hollywood analyst. Analyze books for film adaptation potential and calculate realistic production budgets.

When analyzing a book, consider these factors for budget calculation:
- Book popularity and sales numbers
- Awards won by the book or author
- Fanbase size and engagement
- Franchise potential
- Genre and production scope (VFX, sets, costumes)
- Special effects/VFX requirements
- Target audience demographics
- Author's track record with adaptations
- Adaptation complexity
- Current market trends

Calculate a realistic movie budget between $1M and $300M based on these factors.
Calculate a casting budget that is typically 20-30% of the movie budget.

Select an appropriate real studio based on budget size:
- Major Studios (>$100M): Warner Bros, Universal, Disney, Paramount, Sony Pictures
- Mid-Tier Studios ($30M-$100M): Lionsgate, STX Entertainment, MGM
- Indie Studios (<$30M): A24, Neon, Blumhouse, Focus Features, Searchlight Pictures

Format the budget reasoning as: "Congratulations! Your movie has been bought by [STUDIO NAME]! [4-6 sentences explaining the budget rationale based on the factors above]"

Respond with ONLY a valid JSON object. Do not add markdown.`;

/**
 * JSON schema for book analysis response
 */
const BOOK_ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    popularity: {
      type: 'STRING',
      description: "e.g., 'Massive Bestseller', 'Cult Classic', 'Obscure Find'",
    },
    synopsis: {
      type: 'STRING',
      description: 'A 2-sentence synopsis',
    },
    characters: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          description: {
            type: 'STRING',
            description: '1-2 sentence description including age, ethnicity if known, and key traits',
          },
        },
        required: ['name', 'description'],
      },
    },
    movieBudget: {
      type: 'NUMBER',
      description: 'Realistic movie production budget between $1,000,000 and $300,000,000',
    },
    castingBudget: {
      type: 'NUMBER',
      description: 'Realistic casting budget, typically 20-30% of movie budget',
    },
    studio: {
      type: 'STRING',
      description: "Real studio name appropriate for the budget level (e.g., 'Warner Bros', 'A24', 'Lionsgate')",
    },
    budgetReasoning: {
      type: 'STRING',
      description: "4-6 sentences starting with 'Congratulations! Your movie has been bought by [STUDIO]!' explaining why this budget and studio were chosen",
    },
  },
  required: ['popularity', 'synopsis', 'characters', 'movieBudget', 'castingBudget', 'studio', 'budgetReasoning'],
};

/**
 * Analyzes a book for film adaptation
 * @param {string} apiKey - Gemini API key
 * @param {string} bookName - Name of the book
 * @param {string} author - Author of the book
 * @returns {Promise<object>} Book analysis with characters, budgets, and studio
 */
async function analyzeBook(apiKey, bookName, author) {
  const userQuery = `Analyze the book '${bookName}' by '${author}'. Find the 4 most important main characters. Calculate realistic movie and casting budgets, select an appropriate studio, and provide detailed reasoning.`;

  return await callGeminiAPI(apiKey, userQuery, SYSTEM_PROMPT, BOOK_ANALYSIS_SCHEMA);
}

/**
 * Cloud Function handler for getting book information
 */
const getBookInfoHandler = onRequest(
  {
    secrets: [geminiApiKey],
    cors: true, // Enable CORS for all origins
  },
  async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      // Validate required parameters
      const validation = validateRequiredParams(req.body, ['bookName', 'author']);

      if (!validation.valid) {
        return sendError(res, 400, 'Missing required parameters', {
          missing: validation.missing,
        });
      }

      const { bookName, author } = req.body;

      // Analyze the book
      const result = await analyzeBook(geminiApiKey.value(), bookName, author);

      res.json(result);
    } catch (error) {
      console.error('Error in getBookInfo:', error);
      sendError(res, 500, 'Failed to get book information');
    }
  }
);

module.exports = {
  getBookInfo: getBookInfoHandler,
  analyzeBook, // Export for testing
  SYSTEM_PROMPT, // Export for testing
  BOOK_ANALYSIS_SCHEMA, // Export for testing
};
