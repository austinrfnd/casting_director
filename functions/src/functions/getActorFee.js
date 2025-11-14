/**
 * Get Actor Fee Cloud Function
 *
 * Estimates per-movie booking fees and popularity levels for actors.
 * Implements Firestore caching to reduce API calls and improve performance.
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { callGeminiAPI } = require('../services/geminiClient');
const { getCachedActorData, setCachedActorData } = require('../services/cacheService');
const { validateRequiredParams, sendError } = require('../utils/helpers');

const geminiApiKey = defineSecret('GEMINI_API_KEY');

/**
 * System prompt for actor fee estimation
 */
const SYSTEM_PROMPT = 'You are an expert Hollywood talent agent database. Provide a realistic, current per-movie booking fee in US dollars. Respond with ONLY a valid JSON object. Do not add markdown.';

/**
 * JSON schema for actor fee response
 */
const ACTOR_FEE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fee: { type: 'NUMBER' },
    popularity: {
      type: 'STRING',
      description: "e.g., 'A-List', 'Working Actor', 'Up-and-Comer'",
    },
  },
  required: ['fee', 'popularity'],
};

/**
 * Fetches actor fee data from Gemini API
 * @param {string} apiKey - Gemini API key
 * @param {string} actorName - Name of the actor
 * @returns {Promise<{fee: number, popularity: string}>} Actor fee and popularity
 */
async function fetchActorFeeFromAPI(apiKey, actorName) {
  const userQuery = `Estimate the per-movie fee and popularity for actor '${actorName}'. Respond with this JSON schema.`;

  return await callGeminiAPI(apiKey, userQuery, SYSTEM_PROMPT, ACTOR_FEE_SCHEMA);
}

/**
 * Gets actor data with caching logic
 * Checks cache first, calls API if needed, caches result
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance
 * @param {string} actorName - The name of the actor
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<{fee: number, popularity: string}>} Actor data
 */
async function getActorDataWithCache(db, actorName, apiKey) {
  // Check cache first
  const cachedData = await getCachedActorData(db, actorName);

  if (cachedData) {
    return cachedData;
  }

  // Cache miss or expired - call the Gemini API
  const result = await fetchActorFeeFromAPI(apiKey, actorName);

  // Cache the result for future lookups
  await setCachedActorData(db, actorName, result);

  return result;
}

/**
 * Cloud Function handler for getting actor fee
 */
const getActorFeeHandler = onRequest(
  {
    secrets: [geminiApiKey],
    cors: true,
  },
  async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      // Validate required parameters
      const validation = validateRequiredParams(req.body, ['actorName']);

      if (!validation.valid) {
        return sendError(res, 400, 'Missing required parameters', {
          missing: validation.missing,
        });
      }

      const { actorName } = req.body;

      // Get actor data with caching
      const db = admin.firestore();
      const result = await getActorDataWithCache(db, actorName, geminiApiKey.value());

      res.json(result);
    } catch (error) {
      console.error('Error in getActorFee:', error);
      sendError(res, 500, 'Failed to get actor fee');
    }
  }
);

module.exports = {
  getActorFee: getActorFeeHandler,
  getActorDataWithCache, // Export for testing
  fetchActorFeeFromAPI, // Export for testing
  SYSTEM_PROMPT, // Export for testing
  ACTOR_FEE_SCHEMA, // Export for testing
};
