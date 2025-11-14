/**
 * Tests for Get Actor Fee Cloud Function
 */

const {
  getActorDataWithCache,
  fetchActorFeeFromAPI,
  SYSTEM_PROMPT,
  ACTOR_FEE_SCHEMA,
} = require('../src/functions/getActorFee');
const { callGeminiAPI } = require('../src/services/geminiClient');
const { getCachedActorData, setCachedActorData } = require('../src/services/cacheService');

// Mock dependencies
jest.mock('../src/services/geminiClient');
jest.mock('../src/services/cacheService');

describe('getActorFee', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let mockDb;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockDb = {
      doc: jest.fn(),
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('SYSTEM_PROMPT', () => {
    it('should contain expert Hollywood agent description', () => {
      expect(SYSTEM_PROMPT).toContain('expert Hollywood talent agent database');
    });

    it('should specify realistic fee requirement', () => {
      expect(SYSTEM_PROMPT).toContain('realistic, current per-movie booking fee');
    });

    it('should specify JSON-only response format', () => {
      expect(SYSTEM_PROMPT).toContain('Respond with ONLY a valid JSON object');
      expect(SYSTEM_PROMPT).toContain('Do not add markdown');
    });
  });

  describe('ACTOR_FEE_SCHEMA', () => {
    it('should have correct structure', () => {
      expect(ACTOR_FEE_SCHEMA.type).toBe('OBJECT');
      expect(ACTOR_FEE_SCHEMA.properties).toBeDefined();
      expect(ACTOR_FEE_SCHEMA.required).toBeDefined();
    });

    it('should require fee and popularity', () => {
      expect(ACTOR_FEE_SCHEMA.required).toEqual(['fee', 'popularity']);
    });

    it('should define fee as number', () => {
      expect(ACTOR_FEE_SCHEMA.properties.fee.type).toBe('NUMBER');
    });

    it('should define popularity as string', () => {
      expect(ACTOR_FEE_SCHEMA.properties.popularity.type).toBe('STRING');
    });

    it('should have popularity description with examples', () => {
      expect(ACTOR_FEE_SCHEMA.properties.popularity.description).toContain('A-List');
      expect(ACTOR_FEE_SCHEMA.properties.popularity.description).toContain('Working Actor');
      expect(ACTOR_FEE_SCHEMA.properties.popularity.description).toContain('Up-and-Comer');
    });
  });

  describe('fetchActorFeeFromAPI', () => {
    it('should call Gemini API with correct parameters', async () => {
      const mockResponse = {
        fee: 20000000,
        popularity: 'A-List Star',
      };

      callGeminiAPI.mockResolvedValueOnce(mockResponse);

      const result = await fetchActorFeeFromAPI('test-api-key', 'Tom Hanks');

      expect(callGeminiAPI).toHaveBeenCalledWith(
        'test-api-key',
        "Estimate the per-movie fee and popularity for actor 'Tom Hanks'. Respond with this JSON schema.",
        SYSTEM_PROMPT,
        ACTOR_FEE_SCHEMA
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return fee for A-List actor', async () => {
      const mockResponse = {
        fee: 15000000,
        popularity: 'A-List Star',
      };

      callGeminiAPI.mockResolvedValueOnce(mockResponse);

      const result = await fetchActorFeeFromAPI('test-api-key', 'Leonardo DiCaprio');

      expect(result.fee).toBe(15000000);
      expect(result.popularity).toBe('A-List Star');
    });

    it('should return fee for working actor', async () => {
      const mockResponse = {
        fee: 2000000,
        popularity: 'Working Actor',
      };

      callGeminiAPI.mockResolvedValueOnce(mockResponse);

      const result = await fetchActorFeeFromAPI('test-api-key', 'Character Actor');

      expect(result.fee).toBe(2000000);
      expect(result.popularity).toBe('Working Actor');
    });

    it('should return fee for up-and-comer', async () => {
      const mockResponse = {
        fee: 500000,
        popularity: 'Up-and-Comer',
      };

      callGeminiAPI.mockResolvedValueOnce(mockResponse);

      const result = await fetchActorFeeFromAPI('test-api-key', 'New Actor');

      expect(result.fee).toBe(500000);
      expect(result.popularity).toBe('Up-and-Comer');
    });

    it('should handle API errors', async () => {
      callGeminiAPI.mockRejectedValueOnce(new Error('API Error'));

      await expect(fetchActorFeeFromAPI('test-api-key', 'Test Actor')).rejects.toThrow('API Error');
    });

    it('should format query with actor name', async () => {
      const mockResponse = {
        fee: 10000000,
        popularity: 'A-List Star',
      };

      callGeminiAPI.mockResolvedValueOnce(mockResponse);

      await fetchActorFeeFromAPI('test-api-key', 'Meryl Streep');

      expect(callGeminiAPI).toHaveBeenCalledWith(
        'test-api-key',
        expect.stringContaining('Meryl Streep'),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should handle special characters in actor names', async () => {
      const mockResponse = {
        fee: 8000000,
        popularity: 'A-List Star',
      };

      callGeminiAPI.mockResolvedValueOnce(mockResponse);

      await fetchActorFeeFromAPI('test-api-key', "Lupita Nyong'o");

      expect(callGeminiAPI).toHaveBeenCalledWith(
        'test-api-key',
        expect.stringContaining("Lupita Nyong'o"),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('getActorDataWithCache', () => {
    it('should return cached data on cache hit', async () => {
      const cachedData = {
        fee: 15000000,
        popularity: 'A-List Star',
      };

      getCachedActorData.mockResolvedValueOnce(cachedData);

      const result = await getActorDataWithCache(mockDb, 'Tom Hanks', 'test-api-key');

      expect(getCachedActorData).toHaveBeenCalledWith(mockDb, 'Tom Hanks');
      expect(callGeminiAPI).not.toHaveBeenCalled();
      expect(setCachedActorData).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('should call API on cache miss', async () => {
      getCachedActorData.mockResolvedValueOnce(null);

      const apiResponse = {
        fee: 20000000,
        popularity: 'A-List Star',
      };

      callGeminiAPI.mockResolvedValueOnce(apiResponse);

      const result = await getActorDataWithCache(mockDb, 'Leonardo DiCaprio', 'test-api-key');

      expect(getCachedActorData).toHaveBeenCalledWith(mockDb, 'Leonardo DiCaprio');
      expect(callGeminiAPI).toHaveBeenCalled();
      expect(setCachedActorData).toHaveBeenCalledWith(mockDb, 'Leonardo DiCaprio', apiResponse);
      expect(result).toEqual(apiResponse);
    });

    it('should cache API result after fetching', async () => {
      getCachedActorData.mockResolvedValueOnce(null);

      const apiResponse = {
        fee: 12000000,
        popularity: 'A-List Star',
      };

      callGeminiAPI.mockResolvedValueOnce(apiResponse);

      await getActorDataWithCache(mockDb, 'Margot Robbie', 'test-api-key');

      expect(setCachedActorData).toHaveBeenCalledWith(mockDb, 'Margot Robbie', apiResponse);
    });

    it('should handle cache read errors gracefully', async () => {
      getCachedActorData.mockRejectedValueOnce(new Error('Cache read error'));

      await expect(getActorDataWithCache(mockDb, 'Test Actor', 'test-api-key')).rejects.toThrow('Cache read error');
    });

    it('should handle API errors', async () => {
      getCachedActorData.mockResolvedValueOnce(null);
      callGeminiAPI.mockRejectedValueOnce(new Error('API Error'));

      await expect(getActorDataWithCache(mockDb, 'Test Actor', 'test-api-key')).rejects.toThrow('API Error');
    });

    it('should handle cache write errors gracefully', async () => {
      getCachedActorData.mockResolvedValueOnce(null);

      const apiResponse = {
        fee: 5000000,
        popularity: 'Working Actor',
      };

      callGeminiAPI.mockResolvedValueOnce(apiResponse);
      // setCachedActorData handles errors internally and doesn't throw
      setCachedActorData.mockResolvedValueOnce(undefined);

      // Should still return the API result even if caching fails
      const result = await getActorDataWithCache(mockDb, 'Test Actor', 'test-api-key');

      expect(result).toEqual(apiResponse);
    });
  });

  describe('Integration scenarios', () => {
    it('should fetch and cache Tom Hanks data', async () => {
      getCachedActorData.mockResolvedValueOnce(null);

      const apiResponse = {
        fee: 15000000,
        popularity: 'A-List Star',
      };

      callGeminiAPI.mockResolvedValueOnce(apiResponse);

      const result = await getActorDataWithCache(mockDb, 'Tom Hanks', 'test-api-key');

      expect(result.fee).toBe(15000000);
      expect(result.popularity).toBe('A-List Star');
      expect(setCachedActorData).toHaveBeenCalledWith(mockDb, 'Tom Hanks', apiResponse);
    });

    it('should use cached data on second request', async () => {
      const cachedData = {
        fee: 15000000,
        popularity: 'A-List Star',
      };

      // First request - cache miss, API call
      getCachedActorData.mockResolvedValueOnce(null);
      callGeminiAPI.mockResolvedValueOnce(cachedData);

      await getActorDataWithCache(mockDb, 'Tom Hanks', 'test-api-key');

      // Second request - cache hit
      getCachedActorData.mockResolvedValueOnce(cachedData);

      const result = await getActorDataWithCache(mockDb, 'Tom Hanks', 'test-api-key');

      expect(result).toEqual(cachedData);
      expect(callGeminiAPI).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should handle various popularity tiers', async () => {
      const actors = [
        { name: 'Tom Cruise', fee: 20000000, popularity: 'A-List Star' },
        { name: 'Michael B. Jordan', fee: 8000000, popularity: 'Rising Star' },
        { name: 'Character Actor', fee: 1000000, popularity: 'Working Actor' },
        { name: 'New Face', fee: 250000, popularity: 'Up-and-Comer' },
      ];

      for (const actor of actors) {
        getCachedActorData.mockResolvedValueOnce(null);
        callGeminiAPI.mockResolvedValueOnce({ fee: actor.fee, popularity: actor.popularity });

        const result = await getActorDataWithCache(mockDb, actor.name, 'test-api-key');

        expect(result.fee).toBe(actor.fee);
        expect(result.popularity).toBe(actor.popularity);
      }
    });

    it('should return consistent data structure', async () => {
      getCachedActorData.mockResolvedValueOnce(null);

      const apiResponse = {
        fee: 10000000,
        popularity: 'A-List Star',
      };

      callGeminiAPI.mockResolvedValueOnce(apiResponse);

      const result = await getActorDataWithCache(mockDb, 'Test Actor', 'test-api-key');

      expect(result).toHaveProperty('fee');
      expect(result).toHaveProperty('popularity');
      expect(typeof result.fee).toBe('number');
      expect(typeof result.popularity).toBe('string');
    });

    it('should handle cache-first strategy correctly', async () => {
      const cachedData = {
        fee: 15000000,
        popularity: 'A-List Star',
      };

      // Cache hit - should not call API
      getCachedActorData.mockResolvedValueOnce(cachedData);

      const result = await getActorDataWithCache(mockDb, 'Tom Hanks', 'test-api-key');

      expect(getCachedActorData).toHaveBeenCalled();
      expect(callGeminiAPI).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('should pass through all required parameters to API', async () => {
      getCachedActorData.mockResolvedValueOnce(null);

      const apiResponse = {
        fee: 5000000,
        popularity: 'Working Actor',
      };

      callGeminiAPI.mockResolvedValueOnce(apiResponse);

      await getActorDataWithCache(mockDb, 'Test Actor', 'my-api-key-123');

      expect(callGeminiAPI).toHaveBeenCalledWith(
        'my-api-key-123',
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Cache lifecycle', () => {
    it('should complete full cache cycle: miss -> fetch -> cache -> hit', async () => {
      const apiResponse = {
        fee: 18000000,
        popularity: 'A-List Star',
      };

      // First call - cache miss
      getCachedActorData.mockResolvedValueOnce(null);
      callGeminiAPI.mockResolvedValueOnce(apiResponse);

      const firstResult = await getActorDataWithCache(mockDb, 'Brad Pitt', 'test-api-key');

      expect(firstResult).toEqual(apiResponse);
      expect(getCachedActorData).toHaveBeenCalledTimes(1);
      expect(callGeminiAPI).toHaveBeenCalledTimes(1);
      expect(setCachedActorData).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      getCachedActorData.mockResolvedValueOnce(apiResponse);

      const secondResult = await getActorDataWithCache(mockDb, 'Brad Pitt', 'test-api-key');

      expect(secondResult).toEqual(apiResponse);
      expect(getCachedActorData).toHaveBeenCalledTimes(2);
      expect(callGeminiAPI).toHaveBeenCalledTimes(1); // Still only called once
    });
  });
});
