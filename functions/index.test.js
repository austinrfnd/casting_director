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

// Mock firebase-admin with Firestore
jest.mock('firebase-admin', () => {
  const mockGet = jest.fn(() => Promise.resolve({ exists: false })); // Default: cache miss
  const mockSet = jest.fn(() => Promise.resolve());

  const mockDocRef = {
    get: mockGet,
    set: mockSet
  };

  const mockDoc = jest.fn(() => mockDocRef);

  const mockFirestoreInstance = {
    doc: mockDoc
  };

  const firestoreFn = jest.fn(() => mockFirestoreInstance);
  firestoreFn.FieldValue = {
    serverTimestamp: jest.fn(() => ({ _type: 'serverTimestamp' }))
  };

  // Store references for test access
  firestoreFn._mockGet = mockGet;
  firestoreFn._mockSet = mockSet;
  firestoreFn._mockDoc = mockDoc;

  return {
    initializeApp: jest.fn(),
    apps: [],
    firestore: firestoreFn
  };
});

// Now require the functions after mocks are set up
const myFunctions = require('./index');

// Get references to the mocks for tests
const admin = require('firebase-admin');
const mockGet = admin.firestore._mockGet;
const mockSet = admin.firestore._mockSet;
const mockDoc = admin.firestore._mockDoc;

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

  describe('getActorFee - Caching', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
      // Set default cache miss behavior
      mockGet.mockResolvedValue({ exists: false });
    });

    it('should return cached actor data when cache exists and is not expired', async () => {
      // Mock cache hit with recent data (10 days ago)
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      // Create a mock database with properly mocked methods
      const mockDb = {
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              actorName: 'Tom Hanks',
              fee: 20000000,
              popularity: 'A-List',
              cachedAt: {
                _seconds: Math.floor(tenDaysAgo.getTime() / 1000)
              },
              source: 'gemini-api'
            })
          }),
          set: jest.fn().mockResolvedValue()
        }))
      };

      // Test the helper function directly
      const result = await myFunctions.getActorDataWithCache(
          mockDb,
          'Tom Hanks',
          'test-api-key'
      );

      // Should return cached data without calling Gemini API
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        fee: 20000000,
        popularity: 'A-List'
      });
    });

    it('should call Gemini API when cache does not exist', async () => {
      // Mock cache miss
      mockGet.mockResolvedValueOnce({
        exists: false
      });

      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                fee: 15000000,
                popularity: 'A-List Star'
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
        actorName: 'Leonardo DiCaprio'
      });

      const res = mockResponse();

      await myFunctions.getActorFee(req, res);

      // Should call Gemini API
      expect(global.fetch).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        fee: 15000000,
        popularity: 'A-List Star'
      });

      // Should cache the result
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        actorName: 'Leonardo DiCaprio',
        fee: 15000000,
        popularity: 'A-List Star'
      }));
    });

    it('should call Gemini API when cache is expired (older than 30 days)', async () => {
      // Mock cache with expired data (40 days old)
      const fortyDaysAgo = new Date();
      fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          actorName: 'Jennifer Lawrence',
          fee: 15000000,
          popularity: 'A-List',
          cachedAt: {
            toMillis: () => fortyDaysAgo.getTime()
          },
          source: 'gemini-api'
        })
      });

      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                fee: 18000000,
                popularity: 'A-List Star'
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
        actorName: 'Jennifer Lawrence'
      });

      const res = mockResponse();

      await myFunctions.getActorFee(req, res);

      // Should call Gemini API for fresh data
      expect(global.fetch).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        fee: 18000000,
        popularity: 'A-List Star'
      });
    });

    it('should fallback to API if cache read fails', async () => {
      // Mock Firestore error
      mockGet.mockRejectedValueOnce(new Error('Firestore unavailable'));

      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                fee: 12000000,
                popularity: 'Working Actor'
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
        actorName: 'Emma Stone'
      });

      const res = mockResponse();

      await myFunctions.getActorFee(req, res);

      // Should fallback to Gemini API
      expect(global.fetch).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        fee: 12000000,
        popularity: 'Working Actor'
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
      // Use fake timers to avoid real delays
      jest.useFakeTimers();

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

      // Start the function call
      const functionPromise = new Promise((resolve) => {
        res.once('finish', resolve);
        myFunctions.getActorFee(req, res);
      });

      // Fast-forward through all timers
      await jest.runAllTimersAsync();

      // Wait for the function to complete
      await functionPromise;

      // Restore real timers
      jest.useRealTimers();

      // Should have called fetch twice (once failed, once succeeded)
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Should return success response
      expect(res.json).toHaveBeenCalledWith({
        fee: 15000000,
        popularity: 'A-List'
      });
    });

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
