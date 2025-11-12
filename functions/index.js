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
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

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

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates[0].content?.parts?.[0]?.text) {
        const jsonText = result.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);
      } else {
        throw new Error("Invalid API response structure.");
      }
    } catch (error) {
      console.error("API Call Error:", error.message);
      retries--;
      if (retries === 0) {
        throw new Error("API call failed after several retries.");
      }
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
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

        const systemPrompt = "You are a movie production database. Respond with ONLY a valid JSON object. Do not add markdown.";
        const userQuery = `Analyze the book '${bookName}' by '${author}'. Respond with this JSON schema. Find the 4 most important main characters.`;
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
          },
          required: ["popularity", "synopsis", "characters"],
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
 * Cloud Function: Estimate Actor Fee
 * Returns the estimated per-movie fee and popularity for a given actor
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

        if (!bookName || !bookPopularity || !castDetails) {
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

        const result = await callGeminiAPI(
            userQuery,
            systemPrompt,
            schema,
            geminiApiKey.value()
        );

        res.json(result);
      } catch (error) {
        console.error("Error in generateMovieResults:", error);
        res.status(500).json({error: "Failed to generate movie results"});
      }
    }
);
