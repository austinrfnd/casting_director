/**
 * Tests for Generate Movie Results Cloud Function
 */

const {
  generateResults,
  buildMovieResultsQuery,
  SYSTEM_PROMPT,
  MOVIE_RESULTS_SCHEMA,
} = require('../src/functions/generateMovieResults');
const { callGeminiProAPI } = require('../src/services/geminiClient');

// Mock dependencies
jest.mock('../src/services/geminiClient');

describe('generateMovieResults', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('SYSTEM_PROMPT', () => {
    it('should contain 90s movie critic persona', () => {
      expect(SYSTEM_PROMPT).toContain('fun, snarky 90s movie critic');
    });

    it('should specify JSON-only response format', () => {
      expect(SYSTEM_PROMPT).toContain('Respond with ONLY a valid JSON object');
      expect(SYSTEM_PROMPT).toContain('Do not add markdown');
    });
  });

  describe('MOVIE_RESULTS_SCHEMA', () => {
    it('should have correct structure', () => {
      expect(MOVIE_RESULTS_SCHEMA.type).toBe('OBJECT');
      expect(MOVIE_RESULTS_SCHEMA.properties).toBeDefined();
      expect(MOVIE_RESULTS_SCHEMA.required).toBeDefined();
    });

    it('should require all essential fields', () => {
      expect(MOVIE_RESULTS_SCHEMA.required).toEqual(['boxOffice', 'awards', 'summary']);
    });

    it('should define boxOffice as number', () => {
      expect(MOVIE_RESULTS_SCHEMA.properties.boxOffice.type).toBe('NUMBER');
    });

    it('should define awards as array of strings', () => {
      expect(MOVIE_RESULTS_SCHEMA.properties.awards.type).toBe('ARRAY');
      expect(MOVIE_RESULTS_SCHEMA.properties.awards.items.type).toBe('STRING');
    });

    it('should define summary as string', () => {
      expect(MOVIE_RESULTS_SCHEMA.properties.summary.type).toBe('STRING');
    });

    it('should have descriptive field descriptions', () => {
      expect(MOVIE_RESULTS_SCHEMA.properties.boxOffice.description).toContain('box office gross');
      expect(MOVIE_RESULTS_SCHEMA.properties.awards.description).toContain('Oscar');
      expect(MOVIE_RESULTS_SCHEMA.properties.awards.description).toContain('Razzie');
      expect(MOVIE_RESULTS_SCHEMA.properties.summary.description).toContain('snarky');
    });
  });

  describe('buildMovieResultsQuery', () => {
    it('should include all movie data fields', () => {
      const movieData = {
        bookName: 'Harry Potter',
        bookPopularity: 'Massive Bestseller',
        movieBudget: 125000000,
        castingBudget: 30000000,
        spentBudget: 28000000,
        wentOverBudget: false,
        castDetails: 'Harry Potter: Daniel Radcliffe ($5M)',
      };

      const query = buildMovieResultsQuery(movieData);

      expect(query).toContain('Harry Potter');
      expect(query).toContain('Massive Bestseller');
      expect(query).toContain('125000000');
      expect(query).toContain('30000000');
      expect(query).toContain('28000000');
      expect(query).toContain('false');
      expect(query).toContain('Daniel Radcliffe');
    });

    it('should format query with instructions', () => {
      const movieData = {
        bookName: 'Test Book',
        bookPopularity: 'Cult Classic',
        movieBudget: 10000000,
        castingBudget: 2000000,
        spentBudget: 2500000,
        wentOverBudget: true,
        castDetails: 'Lead: Test Actor ($1M)',
      };

      const query = buildMovieResultsQuery(movieData);

      expect(query).toContain('Hypothesize the movie results');
      expect(query).toContain('Be fun and lighthearted');
      expect(query).toContain('How well did this movie do?');
    });

    it('should handle over-budget scenario', () => {
      const movieData = {
        bookName: 'Ambitious Project',
        bookPopularity: 'Obscure Find',
        movieBudget: 50000000,
        castingBudget: 10000000,
        spentBudget: 15000000,
        wentOverBudget: true,
        castDetails: 'Cast details',
      };

      const query = buildMovieResultsQuery(movieData);

      expect(query).toContain('Went Over Budget: true');
    });

    it('should handle under-budget scenario', () => {
      const movieData = {
        bookName: 'Frugal Film',
        bookPopularity: 'Cult Classic',
        movieBudget: 5000000,
        castingBudget: 1000000,
        spentBudget: 800000,
        wentOverBudget: false,
        castDetails: 'Cast details',
      };

      const query = buildMovieResultsQuery(movieData);

      expect(query).toContain('Went Over Budget: false');
    });

    it('should include cast details', () => {
      const movieData = {
        bookName: 'Test',
        bookPopularity: 'Test',
        movieBudget: 1000000,
        castingBudget: 200000,
        spentBudget: 200000,
        wentOverBudget: false,
        castDetails: 'Lead: Tom Hanks ($15M)\nSupporting: Emma Stone ($5M)',
      };

      const query = buildMovieResultsQuery(movieData);

      expect(query).toContain('Tom Hanks');
      expect(query).toContain('Emma Stone');
    });
  });

  describe('generateResults', () => {
    it('should call Gemini Pro API with correct parameters', async () => {
      const mockResponse = {
        boxOffice: 500000000,
        awards: ['Best Picture (Oscar)', 'Best Actor (Oscar)'],
        summary: 'This movie was a massive hit!',
      };

      callGeminiProAPI.mockResolvedValueOnce(mockResponse);

      const movieData = {
        bookName: 'Harry Potter',
        bookPopularity: 'Massive Bestseller',
        movieBudget: 125000000,
        castingBudget: 30000000,
        spentBudget: 28000000,
        wentOverBudget: false,
        castDetails: 'Cast details',
      };

      const result = await generateResults('test-api-key', movieData);

      expect(callGeminiProAPI).toHaveBeenCalledWith(
        'test-api-key',
        expect.stringContaining('Harry Potter'),
        SYSTEM_PROMPT,
        MOVIE_RESULTS_SCHEMA
      );
      expect(result).toEqual(mockResponse);
    });

    it('should log movie name and API call', async () => {
      const mockResponse = {
        boxOffice: 100000000,
        awards: ['Best Visual Effects (Oscar)'],
        summary: 'Great movie!',
      };

      callGeminiProAPI.mockResolvedValueOnce(mockResponse);

      const movieData = {
        bookName: 'Test Book',
        bookPopularity: 'Bestseller',
        movieBudget: 50000000,
        castingBudget: 10000000,
        spentBudget: 10000000,
        wentOverBudget: false,
        castDetails: 'Cast',
      };

      await generateResults('test-api-key', movieData);

      expect(consoleLogSpy).toHaveBeenCalledWith('generateMovieResults called for book:', 'Test Book');
      expect(consoleLogSpy).toHaveBeenCalledWith('Calling Gemini API for movie results...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Successfully generated movie results');
    });

    it('should generate results for blockbuster', async () => {
      const mockResponse = {
        boxOffice: 1000000000,
        awards: [
          'Best Picture (Oscar)',
          'Best Director (Oscar)',
          'Best Visual Effects (Oscar)',
        ],
        summary: 'This mega-blockbuster dominated the box office and swept awards season. Critics and audiences alike fell in love with this epic adaptation.',
      };

      callGeminiProAPI.mockResolvedValueOnce(mockResponse);

      const movieData = {
        bookName: 'Epic Fantasy Series',
        bookPopularity: 'Massive Bestseller',
        movieBudget: 200000000,
        castingBudget: 50000000,
        spentBudget: 48000000,
        wentOverBudget: false,
        castDetails: 'All-star cast',
      };

      const result = await generateResults('test-api-key', movieData);

      expect(result.boxOffice).toBeGreaterThan(500000000);
      expect(result.awards.length).toBeGreaterThan(0);
      expect(result.summary).toBeTruthy();
    });

    it('should generate results for box office flop', async () => {
      const mockResponse = {
        boxOffice: 5000000,
        awards: ['Worst Picture (Razzie)', 'Worst Director (Razzie)'],
        summary: 'This adaptation crashed and burned at the box office. Critics savaged it, and audiences stayed away in droves. A complete disaster.',
      };

      callGeminiProAPI.mockResolvedValueOnce(mockResponse);

      const movieData = {
        bookName: 'Obscure Novel',
        bookPopularity: 'Obscure Find',
        movieBudget: 50000000,
        castingBudget: 10000000,
        spentBudget: 15000000,
        wentOverBudget: true,
        castDetails: 'Miscast actors',
      };

      const result = await generateResults('test-api-key', movieData);

      expect(result.boxOffice).toBeLessThan(50000000);
      expect(result.awards).toContain('Worst Picture (Razzie)');
      expect(result.summary).toContain('box office');
    });

    it('should generate results for cult classic', async () => {
      const mockResponse = {
        boxOffice: 15000000,
        awards: ['Best Independent Film (Indie Spirit)'],
        summary: "Didn't make a splash initially, but this quirky adaptation found its audience on home video and became a beloved cult classic.",
      };

      callGeminiProAPI.mockResolvedValueOnce(mockResponse);

      const movieData = {
        bookName: 'Quirky Indie Book',
        bookPopularity: 'Cult Classic',
        movieBudget: 5000000,
        castingBudget: 1000000,
        spentBudget: 900000,
        wentOverBudget: false,
        castDetails: 'Perfect indie cast',
      };

      const result = await generateResults('test-api-key', movieData);

      expect(result.boxOffice).toBeLessThan(50000000);
      expect(result.awards).toBeDefined();
      expect(result.summary).toBeTruthy();
    });

    it('should handle API errors', async () => {
      callGeminiProAPI.mockRejectedValueOnce(new Error('API Error'));

      const movieData = {
        bookName: 'Test',
        bookPopularity: 'Test',
        movieBudget: 1000000,
        castingBudget: 200000,
        spentBudget: 200000,
        wentOverBudget: false,
        castDetails: 'Cast',
      };

      await expect(generateResults('test-api-key', movieData)).rejects.toThrow('API Error');
    });

    it('should pass book name in query', async () => {
      const mockResponse = {
        boxOffice: 100000000,
        awards: [],
        summary: 'Test',
      };

      callGeminiProAPI.mockResolvedValueOnce(mockResponse);

      const movieData = {
        bookName: 'The Hunger Games',
        bookPopularity: 'Massive Bestseller',
        movieBudget: 80000000,
        castingBudget: 20000000,
        spentBudget: 18000000,
        wentOverBudget: false,
        castDetails: 'Katniss: Jennifer Lawrence',
      };

      await generateResults('test-api-key', movieData);

      expect(callGeminiProAPI).toHaveBeenCalledWith(
        'test-api-key',
        expect.stringContaining('The Hunger Games'),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle successful blockbuster adaptation', async () => {
      const mockResponse = {
        boxOffice: 850000000,
        awards: [
          'Best Picture (Oscar)',
          'Best Adapted Screenplay (Oscar)',
          'Best Visual Effects (Oscar)',
        ],
        summary: 'This fantasy epic shattered box office records and became a cultural phenomenon. The perfect cast brought beloved characters to life, and critics praised the faithful adaptation. A triumph on every level.',
      };

      callGeminiProAPI.mockResolvedValueOnce(mockResponse);

      const movieData = {
        bookName: 'The Lord of the Rings: The Fellowship of the Ring',
        bookPopularity: 'Massive Bestseller',
        movieBudget: 93000000,
        castingBudget: 23000000,
        spentBudget: 22000000,
        wentOverBudget: false,
        castDetails: 'Frodo: Elijah Wood ($500K), Gandalf: Ian McKellen ($2M), Aragorn: Viggo Mortensen ($1M)',
      };

      const result = await generateResults('test-api-key', movieData);

      expect(result.boxOffice).toBeGreaterThan(100000000);
      expect(result.awards.length).toBeGreaterThan(0);
      expect(result.awards.some(award => award.includes('Oscar'))).toBe(true);
      expect(result.summary).toContain('box office');
    });

    it('should handle over-budget indie film', async () => {
      const mockResponse = {
        boxOffice: 8000000,
        awards: ['Best First Feature (Indie Spirit)'],
        summary: 'Despite going over budget, this quirky indie charmed festival audiences and found a small but devoted following. Not a commercial success, but a critical darling.',
      };

      callGeminiProAPI.mockResolvedValueOnce(mockResponse);

      const movieData = {
        bookName: 'Unknown Gem',
        bookPopularity: 'Obscure Find',
        movieBudget: 3000000,
        castingBudget: 500000,
        spentBudget: 750000,
        wentOverBudget: true,
        castDetails: 'Unknown actors',
      };

      const result = await generateResults('test-api-key', movieData);

      expect(result).toHaveProperty('boxOffice');
      expect(result).toHaveProperty('awards');
      expect(result).toHaveProperty('summary');
      expect(typeof result.boxOffice).toBe('number');
      expect(Array.isArray(result.awards)).toBe(true);
      expect(typeof result.summary).toBe('string');
    });

    it('should return consistent data structure', async () => {
      const mockResponse = {
        boxOffice: 250000000,
        awards: ['Best Sound (Oscar)', 'Best Cinematography (Oscar)'],
        summary: 'A visually stunning adaptation that pleased fans and critics alike.',
      };

      callGeminiProAPI.mockResolvedValueOnce(mockResponse);

      const movieData = {
        bookName: 'Test Book',
        bookPopularity: 'Bestseller',
        movieBudget: 100000000,
        castingBudget: 25000000,
        spentBudget: 24000000,
        wentOverBudget: false,
        castDetails: 'Great cast',
      };

      const result = await generateResults('test-api-key', movieData);

      expect(result).toHaveProperty('boxOffice');
      expect(result).toHaveProperty('awards');
      expect(result).toHaveProperty('summary');
      expect(typeof result.boxOffice).toBe('number');
      expect(Array.isArray(result.awards)).toBe(true);
      expect(typeof result.summary).toBe('string');
    });

    it('should handle awards array properly', async () => {
      const mockResponse = {
        boxOffice: 500000000,
        awards: [
          'Best Picture (Oscar)',
          'Best Director (Oscar)',
          'Best Actor (Oscar)',
          'Best Visual Effects (BAFTA)',
        ],
        summary: 'Award season darling.',
      };

      callGeminiProAPI.mockResolvedValueOnce(mockResponse);

      const movieData = {
        bookName: 'Award Winner',
        bookPopularity: 'Massive Bestseller',
        movieBudget: 150000000,
        castingBudget: 40000000,
        spentBudget: 38000000,
        wentOverBudget: false,
        castDetails: 'Oscar-worthy cast',
      };

      const result = await generateResults('test-api-key', movieData);

      expect(Array.isArray(result.awards)).toBe(true);
      expect(result.awards.length).toBeGreaterThan(0);
      result.awards.forEach(award => {
        expect(typeof award).toBe('string');
      });
    });
  });
});
