/**
 * Firebase Cloud Functions for Casting Director
 *
 * These functions act as a secure proxy between the frontend and the Gemini API.
 * The Gemini API key is stored securely in Firebase and never exposed to the client.
 */

const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Define the secret for Gemini API key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * Helper function to call the Gemini API
 * Includes retry logic with exponential backoff
 */
async function callGeminiAPI(userQuery, systemPrompt, jsonSchema, apiKey) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{parts: [{text: userQuery}]}],
    systemInstruction: {
      parts: [{text: systemPrompt}],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: jsonSchema,
    },
  };

  const maxRetries = 6;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const status = response.status;
        console.error(`API Call Error: HTTP ${status}`);

        // Don't retry client errors (4xx) except 429 (rate limit)
        if (status >= 400 && status < 500 && status !== 429) {
          throw new Error(`HTTP error! status: ${status} (non-retryable)`);
        }

        // For 5xx errors and 429, retry with backoff
        if (attempt === maxRetries - 1) {
          throw new Error(`HTTP error! status: ${status} (max retries reached)`);
        }

        // Calculate delay with exponential backoff and jitter
        // For 503, use longer delays: start at 3s instead of 2s
        const baseDelay = status === 503 ? 3000 : 2000;
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000; // Add up to 1s of random jitter
        const totalDelay = exponentialDelay + jitter;

        console.log(`Retrying in ${Math.round(totalDelay)}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((res) => setTimeout(res, totalDelay));
        attempt++;
        continue;
      }

      const result = await response.json();

      if (result.candidates && result.candidates[0].content?.parts?.[0]?.text) {
        const jsonText = result.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);
      } else {
        throw new Error("Invalid API response structure.");
      }
    } catch (error) {
      // If it's a non-retryable error or network error on last attempt, throw
      if (error.message.includes("non-retryable") || attempt === maxRetries - 1) {
        console.error(`Final error after ${attempt + 1} attempts:`, error.message);
        throw new Error(`API call failed: ${error.message}`);
      }

      // For network errors, retry with backoff
      const baseDelay = 2000;
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const totalDelay = exponentialDelay + jitter;

      console.log(`Network error, retrying in ${Math.round(totalDelay)}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((res) => setTimeout(res, totalDelay));
      attempt++;
    }
  }
}

/**
 * Cloud Function: Get Book Information
 * Analyzes a book and returns popularity, synopsis, and main characters
 */
exports.getBookInfo = onRequest(
    {
      secrets: [geminiApiKey],
      cors: true, // Enable CORS for all origins
    },
    async (req, res) => {
      // Only allow POST requests
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      try {
        const {bookName, author} = req.body;

        if (!bookName || !author) {
          res.status(400).json({error: "Missing bookName or author"});
          return;
        }

        const systemPrompt = `You are a movie production database and expert Hollywood analyst. Analyze books for film adaptation potential and calculate realistic production budgets.

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

        const userQuery = `Analyze the book '${bookName}' by '${author}'. Find the 4 most important main characters. Calculate realistic movie and casting budgets, select an appropriate studio, and provide detailed reasoning.`;

        const schema = {
          type: "OBJECT",
          properties: {
            popularity: {
              type: "STRING",
              description: "e.g., 'Massive Bestseller', 'Cult Classic', 'Obscure Find'",
            },
            synopsis: {
              type: "STRING",
              description: "A 2-sentence synopsis",
            },
            characters: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: {type: "STRING"},
                  description: {
                    type: "STRING",
                    description: "1-2 sentence description including age, ethnicity if known, and key traits",
                  },
                },
                required: ["name", "description"],
              },
            },
            movieBudget: {
              type: "NUMBER",
              description: "Realistic movie production budget between $1,000,000 and $300,000,000",
            },
            castingBudget: {
              type: "NUMBER",
              description: "Realistic casting budget, typically 20-30% of movie budget",
            },
            studio: {
              type: "STRING",
              description: "Real studio name appropriate for the budget level (e.g., 'Warner Bros', 'A24', 'Lionsgate')",
            },
            budgetReasoning: {
              type: "STRING",
              description: "4-6 sentences starting with 'Congratulations! Your movie has been bought by [STUDIO]!' explaining why this budget and studio were chosen",
            },
          },
          required: ["popularity", "synopsis", "characters", "movieBudget", "castingBudget", "studio", "budgetReasoning"],
        };

        const result = await callGeminiAPI(
            userQuery,
            systemPrompt,
            schema,
            geminiApiKey.value()
        );

        res.json(result);
      } catch (error) {
        console.error("Error in getBookInfo:", error);
        res.status(500).json({error: "Failed to get book information"});
      }
    }
);

/**
 * Normalizes actor name for cache key (lowercase, trimmed)
 */
function normalizeActorName(actorName) {
  return actorName.toLowerCase().trim();
}

/**
 * Cloud Function: Estimate Actor Fee
 * Returns the estimated per-movie fee and popularity for a given actor
 * Implements Firebase caching to reduce API calls and improve performance
 */
exports.getActorFee = onRequest(
    {
      secrets: [geminiApiKey],
      cors: true,
    },
    async (req, res) => {
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      try {
        const {actorName} = req.body;

        if (!actorName) {
          res.status(400).json({error: "Missing actorName"});
          return;
        }

        const db = admin.firestore();
        const normalizedName = normalizeActorName(actorName);
        const appId = "default-app-id"; // Use same appId as frontend
        const cacheDocRef = db.doc(`artifacts/${appId}/public/data/actorCache/${normalizedName}`);

        // Check cache first
        try {
          const cacheDoc = await cacheDocRef.get();

          if (cacheDoc.exists) {
            const cachedData = cacheDoc.data();

            // Check if cache has expired (30 days)
            const now = Date.now();
            const cachedAt = cachedData.cachedAt?._seconds * 1000 || 0;
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

            if (now - cachedAt < thirtyDaysInMs) {
              console.log(`Cache hit for actor: ${actorName}`);
              res.json({
                fee: cachedData.fee,
                popularity: cachedData.popularity,
              });
              return;
            } else {
              console.log(`Cache expired for actor: ${actorName}`);
            }
          } else {
            console.log(`Cache miss for actor: ${actorName}`);
          }
        } catch (cacheError) {
          // If cache check fails, log and continue to API call
          console.warn("Cache check failed, falling back to API:", cacheError);
        }

        // Cache miss or expired - call the Gemini API
        const systemPrompt = "You are an expert Hollywood talent agent database. Provide a realistic, current per-movie booking fee in US dollars. Respond with ONLY a valid JSON object. Do not add markdown.";
        const userQuery = `Estimate the per-movie fee and popularity for actor '${actorName}'. Respond with this JSON schema.`;
        const schema = {
          type: "OBJECT",
          properties: {
            fee: {type: "NUMBER"},
            popularity: {
              type: "STRING",
              description: "e.g., 'A-List', 'Working Actor', 'Up-and-Comer'",
            },
          },
          required: ["fee", "popularity"],
        };

        const result = await callGeminiAPI(
            userQuery,
            systemPrompt,
            schema,
            geminiApiKey.value()
        );

        // Cache the result for future lookups
        try {
          await cacheDocRef.set({
            actorName: actorName, // Store original name
            fee: result.fee,
            popularity: result.popularity,
            cachedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: "gemini-api",
          });
          console.log(`Cached actor data for: ${actorName}`);
        } catch (cacheWriteError) {
          // Log but don't fail if cache write fails
          console.warn("Failed to cache actor data:", cacheWriteError);
        }

        res.json(result);
      } catch (error) {
        console.error("Error in getActorFee:", error);
        res.status(500).json({error: "Failed to get actor fee"});
      }
    }
);

/**
 * Cloud Function: Generate Movie Results
 * Generates box office performance, awards, and a fun summary
 */
exports.generateMovieResults = onRequest(
    {
      secrets: [geminiApiKey],
      cors: true,
      timeoutSeconds: 120, // Increase timeout to 2 minutes for AI processing
    },
    async (req, res) => {
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      try {
        const {
          bookName,
          bookPopularity,
          movieBudget,
          castingBudget,
          spentBudget,
          wentOverBudget,
          castDetails,
        } = req.body;

        console.log("generateMovieResults called for book:", bookName);

        if (!bookName || !bookPopularity || !castDetails) {
          console.error("Missing required fields:", {bookName, bookPopularity, castDetails});
          res.status(400).json({error: "Missing required fields"});
          return;
        }

        const systemPrompt = "You are a fun, snarky 90s movie critic. Respond with ONLY a valid JSON object. Do not add markdown.";
        const userQuery = `
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
        const schema = {
          type: "OBJECT",
          properties: {
            boxOffice: {
              type: "NUMBER",
              description: "Total box office gross as a number",
            },
            awards: {
              type: "ARRAY",
              items: {type: "STRING"},
              description: "List of awards, e.g., 'Best Actor (Oscar)', 'Worst Director (Razzie)'",
            },
            summary: {
              type: "STRING",
              description: "A 1-2 paragraph fun, snarky summary of the movie's release and reception.",
            },
          },
          required: ["boxOffice", "awards", "summary"],
        };

        console.log("Calling Gemini API for movie results...");
        const result = await callGeminiAPI(
            userQuery,
            systemPrompt,
            schema,
            geminiApiKey.value()
        );

        console.log("Successfully generated movie results");
        res.json(result);
      } catch (error) {
        console.error("Error in generateMovieResults:", error);
        res.status(500).json({
          error: "Failed to generate movie results",
          details: error.message,
        });
      }
    }
);
