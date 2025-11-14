/**
 * Gemini API Client Service
 *
 * Provides a centralized interface for calling Google's Gemini API
 * with retry logic, exponential backoff, and support for multiple models.
 */

/**
 * Call Gemini API with retry logic and exponential backoff
 *
 * @param {string} apiKey - Gemini API key
 * @param {string} userQuery - User's query/prompt
 * @param {string} systemPrompt - System instructions for the AI
 * @param {object} jsonSchema - Expected response schema
 * @param {string} model - Model to use (default: gemini-2.5-flash)
 * @returns {Promise<object>} Parsed JSON response from Gemini
 */
async function callGeminiAPI(apiKey, userQuery, systemPrompt, jsonSchema, model = 'gemini-2.5-flash') {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
        console.error(`API Call Error: HTTP ${status} for model ${model}`);

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
 * Call Gemini Pro model (for complex requests)
 *
 * This is a convenience wrapper that uses gemini-2.5-pro model
 * for requests requiring higher quality/more complex reasoning.
 *
 * @param {string} apiKey - Gemini API key
 * @param {string} userQuery - User's query/prompt
 * @param {string} systemPrompt - System instructions for the AI
 * @param {object} jsonSchema - Expected response schema
 * @returns {Promise<object>} Parsed JSON response from Gemini Pro
 */
async function callGeminiProAPI(apiKey, userQuery, systemPrompt, jsonSchema) {
  return callGeminiAPI(apiKey, userQuery, systemPrompt, jsonSchema, 'gemini-2.5-pro');
}

module.exports = {
  callGeminiAPI,
  callGeminiProAPI,
};
