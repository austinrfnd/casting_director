/**
 * Actor Data Caching Service
 *
 * Provides caching operations for actor fee lookups using Firestore.
 * Implements a 30-day TTL (time to live) for cached entries.
 */

const admin = require("firebase-admin");

/**
 * Normalizes actor name for cache key consistency
 * @param {string} actorName - Actor name to normalize
 * @returns {string} Normalized actor name (lowercase, trimmed)
 */
function normalizeActorName(actorName) {
  return actorName.toLowerCase().trim();
}

/**
 * Checks if cached data has expired (30-day TTL)
 * @param {object} cachedAt - Firestore timestamp object
 * @returns {boolean} True if cache has expired
 */
function isExpired(cachedAt) {
  if (!cachedAt || !cachedAt._seconds) {
    return true;
  }

  const now = Date.now();
  const cachedAtMs = cachedAt._seconds * 1000;
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

  return (now - cachedAtMs) >= thirtyDaysInMs;
}

/**
 * Retrieves cached actor data from Firestore
 * @param {object} db - Firestore database instance
 * @param {string} actorName - Actor name to lookup
 * @returns {Promise<object|null>} Cached actor data or null if not found/expired
 */
async function getCachedActorData(db, actorName) {
  const normalizedName = normalizeActorName(actorName);
  const appId = "default-app-id";
  const cacheDocRef = db.doc(`artifacts/${appId}/public/data/actorCache/${normalizedName}`);

  try {
    const cacheDoc = await cacheDocRef.get();

    if (!cacheDoc.exists) {
      console.log(`Cache miss for actor: ${actorName}`);
      return null;
    }

    const cachedData = cacheDoc.data();

    // Check if cache has expired
    if (isExpired(cachedData.cachedAt)) {
      console.log(`Cache expired for actor: ${actorName}`);
      return null;
    }

    console.log(`Cache hit for actor: ${actorName}`);
    return {
      fee: cachedData.fee,
      popularity: cachedData.popularity,
    };
  } catch (cacheError) {
    // If cache check fails, log and return null (graceful degradation)
    console.warn("Cache check failed, falling back to API:", cacheError);
    return null;
  }
}

/**
 * Stores actor data in Firestore cache
 * @param {object} db - Firestore database instance
 * @param {string} actorName - Actor name (original casing)
 * @param {object} data - Actor data to cache
 * @param {number} data.fee - Actor's per-movie fee
 * @param {string} data.popularity - Actor's popularity level
 * @returns {Promise<void>}
 */
async function setCachedActorData(db, actorName, data) {
  const normalizedName = normalizeActorName(actorName);
  const appId = "default-app-id";
  const cacheDocRef = db.doc(`artifacts/${appId}/public/data/actorCache/${normalizedName}`);

  try {
    await cacheDocRef.set({
      actorName: actorName, // Store original name
      fee: data.fee,
      popularity: data.popularity,
      cachedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "gemini-api",
    });
    console.log(`Cached actor data for: ${actorName}`);
  } catch (cacheWriteError) {
    console.warn("Failed to cache actor data:", cacheWriteError);
    // Don't throw - cache write failures should not break the function
  }
}

module.exports = {
  normalizeActorName,
  isExpired,
  getCachedActorData,
  setCachedActorData,
};
