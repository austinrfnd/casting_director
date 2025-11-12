/**
 * Integration Tests for Firebase Cloud Functions
 *
 * These tests mock the Gemini API calls to test the Firebase Functions
 * without making actual API requests.
 */

const {EventEmitter} = require('events');

// Mock fetch globally before requiring anything
global.fetch = jest.fn();

// Mock the secret
const mockGeminiApiKey = {
  value: () => 'test-api-key-12345'
};

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => mockGeminiApiKey
}));

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  apps: []
}));

// Now require the functions after mocks are set up
const myFunctions = require('./index');

/**
 * Creates a mock HTTP request object
 */
function mockRequest(method, body) {
  const req = new EventEmitter();
  req.method = method;
  req.body = body;
  req.headers = {};
  req.rawBody = Buffer.from(JSON.stringify(body));
  return req;
}

/**
 * Creates a mock HTTP response object
 */
function mockResponse() {
  const res = new EventEmitter();
  res.statusCode = 200;

  res.status = jest.fn(function(code) {
    this.statusCode = code;
    return this;
  });

  res.json = jest.fn(function(data) {
    this.emit('finish');
    return this;
  });

  res.send = jest.fn(function(data) {
    this.emit('finish');
    return this;
  });

  res.setHeader = jest.fn();
  res.getHeader = jest.fn();
  res.removeHeader = jest.fn();
  res.write = jest.fn();
  res.end = jest.fn(function() {
    this.emit('finish');
  });

  res.on = EventEmitter.prototype.on;
  res.once = EventEmitter.prototype.once;
  res.emit = EventEmitter.prototype.emit;

  return res;
}

describe('Firebase Cloud Functions - Integration Tests', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getBookInfo', () => {
    it('should return book information with mocked Gemini response', async () => {
      // Mock successful Gemini API response
      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                popularity: 'Massive Bestseller',
                synopsis: 'A hobbit goes on an adventure. Dragons and treasure ensue.',
                characters: [
                  {
                    name: 'Bilbo Baggins',
                    description: 'A middle-aged hobbit who loves comfort but seeks adventure.'
                  },
                  {
                    name: 'Gandalf',
                    description: 'A wise wizard with a long grey beard.'
                  },
                  {
                    name: 'Thorin Oakenshield',
                    description: 'A dwarf prince seeking to reclaim his homeland.'
                  },
                  {
                    name: 'Smaug',
                    description: 'A greedy dragon guarding a mountain of treasure.'
                  }
                ]
              })
            }]
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse
      });

      const req = mockRequest('POST', {
        bookName: 'The Hobbit',
        author: 'J.R.R. Tolkien'
      });

      const res = mockResponse();

      // Call the function
      await myFunctions.getBookInfo(req, res);

      // Verify the response
      expect(res.json).toHaveBeenCalledWith({
        popularity: 'Massive Bestseller',
        synopsis: 'A hobbit goes on an adventure. Dragons and treasure ensue.',
        characters: expect.arrayContaining([
          expect.objectContaining({
            name: 'Bilbo Baggins'
          })
        ])
      });

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing parameters', async () => {
      const req = mockRequest('POST', {
        bookName: 'The Hobbit'
        // Missing author
      });

      const res = mockResponse();

      await myFunctions.getBookInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing bookName or author'
      });
    });

    it('should return 405 for non-POST requests', async () => {
      const req = mockRequest('GET', {});
      const res = mockResponse();

      await myFunctions.getBookInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Method not allowed'
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error (non-retryable 400 error)
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      const req = mockRequest('POST', {
        bookName: 'Invalid Book',
        author: 'Nobody'
      });

      const res = mockResponse();

      await myFunctions.getBookInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get book information'
      });
    });
  });

  describe('getActorFee', () => {
    it('should return actor fee with mocked Gemini response', async () => {
      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                fee: 20000000,
                popularity: 'A-List'
              })
            }]
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse
      });

      const req = mockRequest('POST', {
        actorName: 'Tom Hanks'
      });

      const res = mockResponse();

      await myFunctions.getActorFee(req, res);

      expect(res.json).toHaveBeenCalledWith({
        fee: 20000000,
        popularity: 'A-List'
      });
    });

    it('should return 400 for missing actorName', async () => {
      const req = mockRequest('POST', {});
      const res = mockResponse();

      await myFunctions.getActorFee(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing actorName'
      });
    });
  });

  describe('generateMovieResults', () => {
    it('should generate movie results with mocked Gemini response', async () => {
      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                boxOffice: 950000000,
                awards: [
                  'Best Picture (Oscar)',
                  'Best Director (Oscar)',
                  'Best Visual Effects (Oscar)'
                ],
                summary: 'This movie was an instant classic! The casting was perfect and audiences loved it.'
              })
            }]
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse
      });

      const req = mockRequest('POST', {
        bookName: 'The Hobbit',
        bookPopularity: 'Massive Bestseller',
        movieBudget: 180000000,
        castingBudget: 45000000,
        spentBudget: 42000000,
        wentOverBudget: false,
        castDetails: 'Bilbo: Martin Freeman, Gandalf: Ian McKellen'
      });

      const res = mockResponse();

      await myFunctions.generateMovieResults(req, res);

      expect(res.json).toHaveBeenCalledWith({
        boxOffice: 950000000,
        awards: expect.arrayContaining([
          'Best Picture (Oscar)'
        ]),
        summary: expect.any(String)
      });
    });

    it('should return 400 for missing required fields', async () => {
      const req = mockRequest('POST', {
        bookName: 'The Hobbit'
        // Missing other required fields
      });

      const res = mockResponse();

      await myFunctions.generateMovieResults(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
    });
  });

  describe('Gemini API Retry Logic', () => {
    it('should retry on 429 rate limit errors', async () => {
      // First call fails with 429, second succeeds
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    fee: 15000000,
                    popularity: 'A-List'
                  })
                }]
              }
            }]
          })
        });

      const req = mockRequest('POST', {
        actorName: 'Leonardo DiCaprio'
      });

      const res = mockResponse();

      await myFunctions.getActorFee(req, res);

      // Should have called fetch twice (once failed, once succeeded)
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Should return success response
      expect(res.json).toHaveBeenCalledWith({
        fee: 15000000,
        popularity: 'A-List'
      });
    }, 10000); // Increase timeout for retry delays

    it('should not retry on 400 bad request errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      const req = mockRequest('POST', {
        actorName: 'Test Actor'
      });

      const res = mockResponse();

      await myFunctions.getActorFee(req, res);

      // Should only call fetch once (no retry for 4xx errors except 429)
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Should return error
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
