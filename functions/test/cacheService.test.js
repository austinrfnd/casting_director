/**
 * Tests for Actor Data Caching Service
 */

const {
  normalizeActorName,
  isExpired,
  getCachedActorData,
  setCachedActorData,
} = require('../src/services/cacheService');

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
    },
  },
}));

describe('cacheService', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let mockDb;
  let mockDocRef;
  let mockDoc;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock Firestore document
    mockDoc = {
      exists: false,
      data: jest.fn(),
    };

    mockDocRef = {
      get: jest.fn().mockResolvedValue(mockDoc),
      set: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      doc: jest.fn().mockReturnValue(mockDocRef),
    };
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('normalizeActorName', () => {
    it('should convert to lowercase', () => {
      expect(normalizeActorName('Tom Hanks')).toBe('tom hanks');
    });

    it('should trim whitespace', () => {
      expect(normalizeActorName('  Tom Hanks  ')).toBe('tom hanks');
    });

    it('should handle both lowercase and trim', () => {
      expect(normalizeActorName('  MERYL STREEP  ')).toBe('meryl streep');
    });

    it('should handle already normalized names', () => {
      expect(normalizeActorName('tom hanks')).toBe('tom hanks');
    });

    it('should handle single word names', () => {
      expect(normalizeActorName('Madonna')).toBe('madonna');
    });

    it('should handle names with special characters', () => {
      expect(normalizeActorName("Lupita Nyong'o")).toBe("lupita nyong'o");
    });
  });

  describe('isExpired', () => {
    it('should return true if cachedAt is null', () => {
      expect(isExpired(null)).toBe(true);
    });

    it('should return true if cachedAt is undefined', () => {
      expect(isExpired(undefined)).toBe(true);
    });

    it('should return true if cachedAt has no _seconds', () => {
      expect(isExpired({})).toBe(true);
    });

    it('should return false for recently cached data (1 day old)', () => {
      const oneDayAgo = Date.now() / 1000 - (1 * 24 * 60 * 60);
      expect(isExpired({ _seconds: oneDayAgo })).toBe(false);
    });

    it('should return false for data cached 29 days ago', () => {
      const twentyNineDaysAgo = Date.now() / 1000 - (29 * 24 * 60 * 60);
      expect(isExpired({ _seconds: twentyNineDaysAgo })).toBe(false);
    });

    it('should return true for data cached exactly 30 days ago', () => {
      const thirtyDaysAgo = Date.now() / 1000 - (30 * 24 * 60 * 60);
      expect(isExpired({ _seconds: thirtyDaysAgo })).toBe(true);
    });

    it('should return true for data cached 31 days ago', () => {
      const thirtyOneDaysAgo = Date.now() / 1000 - (31 * 24 * 60 * 60);
      expect(isExpired({ _seconds: thirtyOneDaysAgo })).toBe(true);
    });
  });

  describe('getCachedActorData', () => {
    it('should return null for cache miss', async () => {
      mockDoc.exists = false;

      const result = await getCachedActorData(mockDb, 'Tom Hanks');

      expect(result).toBeNull();
      expect(mockDb.doc).toHaveBeenCalledWith(
        'artifacts/default-app-id/public/data/actorCache/tom hanks'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('Cache miss for actor: Tom Hanks');
    });

    it('should return null for expired cache', async () => {
      const thirtyOneDaysAgo = Date.now() / 1000 - (31 * 24 * 60 * 60);

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue({
        fee: 15000000,
        popularity: 'A-List Star',
        cachedAt: { _seconds: thirtyOneDaysAgo },
      });

      const result = await getCachedActorData(mockDb, 'Tom Hanks');

      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith('Cache expired for actor: Tom Hanks');
    });

    it('should return cached data for valid cache hit', async () => {
      const oneDayAgo = Date.now() / 1000 - (1 * 24 * 60 * 60);

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue({
        fee: 15000000,
        popularity: 'A-List Star',
        cachedAt: { _seconds: oneDayAgo },
      });

      const result = await getCachedActorData(mockDb, 'Tom Hanks');

      expect(result).toEqual({
        fee: 15000000,
        popularity: 'A-List Star',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith('Cache hit for actor: Tom Hanks');
    });

    it('should normalize actor name for cache lookup', async () => {
      mockDoc.exists = false;

      await getCachedActorData(mockDb, '  TOM HANKS  ');

      expect(mockDb.doc).toHaveBeenCalledWith(
        'artifacts/default-app-id/public/data/actorCache/tom hanks'
      );
    });

    it('should return null and warn on cache read error', async () => {
      mockDocRef.get.mockRejectedValueOnce(new Error('Firestore read error'));

      const result = await getCachedActorData(mockDb, 'Tom Hanks');

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cache check failed, falling back to API:',
        expect.any(Error)
      );
    });

    it('should handle missing cachedAt field gracefully', async () => {
      mockDoc.exists = true;
      mockDoc.data.mockReturnValue({
        fee: 15000000,
        popularity: 'A-List Star',
        // No cachedAt field
      });

      const result = await getCachedActorData(mockDb, 'Tom Hanks');

      expect(result).toBeNull();
    });
  });

  describe('setCachedActorData', () => {
    it('should store actor data in cache', async () => {
      const actorData = {
        fee: 15000000,
        popularity: 'A-List Star',
      };

      await setCachedActorData(mockDb, 'Tom Hanks', actorData);

      expect(mockDb.doc).toHaveBeenCalledWith(
        'artifacts/default-app-id/public/data/actorCache/tom hanks'
      );
      expect(mockDocRef.set).toHaveBeenCalledWith({
        actorName: 'Tom Hanks',
        fee: 15000000,
        popularity: 'A-List Star',
        cachedAt: 'MOCK_TIMESTAMP',
        source: 'gemini-api',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith('Cached actor data for: Tom Hanks');
    });

    it('should normalize actor name for cache key', async () => {
      const actorData = {
        fee: 5000000,
        popularity: 'Working Actor',
      };

      await setCachedActorData(mockDb, '  EMMA STONE  ', actorData);

      expect(mockDb.doc).toHaveBeenCalledWith(
        'artifacts/default-app-id/public/data/actorCache/emma stone'
      );
      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          actorName: '  EMMA STONE  ', // Original name preserved
        })
      );
    });

    it('should not throw on cache write error', async () => {
      mockDocRef.set.mockRejectedValueOnce(new Error('Firestore write error'));

      const actorData = {
        fee: 15000000,
        popularity: 'A-List Star',
      };

      // Should not throw
      await expect(
        setCachedActorData(mockDb, 'Tom Hanks', actorData)
      ).resolves.toBeUndefined();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to cache actor data:',
        expect.any(Error)
      );
    });

    it('should store server timestamp', async () => {
      const actorData = {
        fee: 8000000,
        popularity: 'Up-and-Comer',
      };

      await setCachedActorData(mockDb, 'Timothée Chalamet', actorData);

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          cachedAt: 'MOCK_TIMESTAMP',
        })
      );
    });

    it('should store source as gemini-api', async () => {
      const actorData = {
        fee: 12000000,
        popularity: 'A-List Star',
      };

      await setCachedActorData(mockDb, 'Margot Robbie', actorData);

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'gemini-api',
        })
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full cache cycle: miss -> set -> hit', async () => {
      const actorData = {
        fee: 20000000,
        popularity: 'A-List Star',
      };

      // 1. Cache miss
      mockDoc.exists = false;
      let result = await getCachedActorData(mockDb, 'Leonardo DiCaprio');
      expect(result).toBeNull();

      // 2. Set cache
      await setCachedActorData(mockDb, 'Leonardo DiCaprio', actorData);
      expect(mockDocRef.set).toHaveBeenCalled();

      // 3. Cache hit (simulate fresh cache)
      const nowSeconds = Date.now() / 1000;
      mockDoc.exists = true;
      mockDoc.data.mockReturnValue({
        ...actorData,
        actorName: 'Leonardo DiCaprio',
        cachedAt: { _seconds: nowSeconds },
        source: 'gemini-api',
      });

      result = await getCachedActorData(mockDb, 'Leonardo DiCaprio');
      expect(result).toEqual(actorData);
    });

    it('should handle cache expiration gracefully', async () => {
      const actorData = {
        fee: 10000000,
        popularity: 'A-List Star',
      };

      // Set cache
      await setCachedActorData(mockDb, 'Brad Pitt', actorData);

      // Simulate 31-day-old cache
      const thirtyOneDaysAgo = Date.now() / 1000 - (31 * 24 * 60 * 60);
      mockDoc.exists = true;
      mockDoc.data.mockReturnValue({
        ...actorData,
        cachedAt: { _seconds: thirtyOneDaysAgo },
      });

      const result = await getCachedActorData(mockDb, 'Brad Pitt');
      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith('Cache expired for actor: Brad Pitt');
    });
  });
});
