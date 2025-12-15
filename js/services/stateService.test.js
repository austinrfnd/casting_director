import { describe, it, expect, beforeEach } from 'vitest';
import {
  getState,
  getBookName,
  getAuthor,
  getBookInfo,
  getMovieBudget,
  getCastingBudget,
  getSpentBudget,
  getCastList,
  getDb,
  getAuth,
  getUserId,
  getApp,
  updateBookInfo,
  updateBudgets,
  updateCastMember,
  updateSpentBudget,
  setFirebaseInstances,
  resetState,
} from './stateService.js';

describe('stateService', () => {
  beforeEach(() => {
    // Reset state before each test
    resetState();
  });

  describe('initial state', () => {
    it('should have empty initial values', () => {
      expect(getBookName()).toBe('');
      expect(getAuthor()).toBe('');
      expect(getBookInfo()).toBeNull();
      expect(getMovieBudget()).toBe(0);
      expect(getCastingBudget()).toBe(0);
      expect(getSpentBudget()).toBe(0);
      expect(getCastList()).toEqual([]);
    });

    it('should have null Firebase instances initially', () => {
      expect(getDb()).toBeNull();
      expect(getAuth()).toBeNull();
      expect(getUserId()).toBeNull();
      expect(getApp()).toBeNull();
    });
  });

  describe('updateBookInfo', () => {
    it('should update book name, author, and book info', () => {
      const bookInfo = {
        popularity: 'High',
        synopsis: 'A great book',
        characters: [
          { name: 'Character 1', description: 'Main character' },
          { name: 'Character 2', description: 'Supporting' },
        ],
        movieBudget: 50000000,
        castingBudget: 10000000,
      };

      updateBookInfo('Test Book', 'Test Author', bookInfo);

      expect(getBookName()).toBe('Test Book');
      expect(getAuthor()).toBe('Test Author');
      expect(getBookInfo()).toEqual(bookInfo);
    });

    it('should initialize cast list based on number of characters', () => {
      const bookInfo = {
        characters: [
          { name: 'Character 1' },
          { name: 'Character 2' },
          { name: 'Character 3' },
        ],
      };

      updateBookInfo('Test Book', 'Test Author', bookInfo);

      const castList = getCastList();
      expect(castList).toHaveLength(3);
      expect(castList.every(item => item === null)).toBe(true);
    });

    it('should handle book info without characters', () => {
      const bookInfo = {
        popularity: 'High',
        synopsis: 'A great book',
      };

      updateBookInfo('Test Book', 'Test Author', bookInfo);

      expect(getBookInfo()).toEqual(bookInfo);
      // Cast list should remain empty if no characters
    });
  });

  describe('updateBudgets', () => {
    it('should update movie and casting budgets', () => {
      updateBudgets(50000000, 10000000);

      expect(getMovieBudget()).toBe(50000000);
      expect(getCastingBudget()).toBe(10000000);
    });

    it('should handle zero budgets', () => {
      updateBudgets(0, 0);

      expect(getMovieBudget()).toBe(0);
      expect(getCastingBudget()).toBe(0);
    });
  });

  describe('updateCastMember', () => {
    beforeEach(() => {
      const bookInfo = {
        characters: [
          { name: 'Character 1' },
          { name: 'Character 2' },
        ],
      };
      updateBookInfo('Test', 'Author', bookInfo);
    });

    it('should update a cast member at specified index', () => {
      const castData = {
        character: 'Character 1',
        actor: 'Actor Name',
        fee: 5000000,
        popularity: 'A-List',
      };

      updateCastMember(0, castData);

      const castList = getCastList();
      expect(castList[0]).toEqual(castData);
      expect(castList[1]).toBeNull();
    });

    it('should clear a cast member when passed null', () => {
      const castData = {
        character: 'Character 1',
        actor: 'Actor Name',
        fee: 5000000,
        popularity: 'A-List',
      };

      updateCastMember(0, castData);
      updateCastMember(0, null);

      expect(getCastList()[0]).toBeNull();
    });

    it('should throw error for invalid index', () => {
      expect(() => updateCastMember(-1, {})).toThrow('Invalid cast index');
      expect(() => updateCastMember(10, {})).toThrow('Invalid cast index');
    });
  });

  describe('updateSpentBudget', () => {
    it('should update spent budget', () => {
      updateSpentBudget(7500000);
      expect(getSpentBudget()).toBe(7500000);
    });

    it('should handle zero spent budget', () => {
      updateSpentBudget(0);
      expect(getSpentBudget()).toBe(0);
    });
  });

  describe('setFirebaseInstances', () => {
    it('should set Firebase instances', () => {
      const mockApp = { name: 'test-app' };
      const mockDb = { type: 'firestore' };
      const mockAuth = { type: 'auth' };
      const mockUserId = 'user123';

      setFirebaseInstances(mockApp, mockDb, mockAuth, mockUserId);

      expect(getApp()).toEqual(mockApp);
      expect(getDb()).toEqual(mockDb);
      expect(getAuth()).toEqual(mockAuth);
      expect(getUserId()).toBe(mockUserId);
    });
  });

  describe('resetState', () => {
    it('should reset all state values to initial state', () => {
      // Set up some state
      const bookInfo = {
        characters: [{ name: 'Character 1' }],
      };
      updateBookInfo('Test Book', 'Test Author', bookInfo);
      updateBudgets(50000000, 10000000);
      updateSpentBudget(7500000);

      // Reset
      resetState();

      // Verify all reset
      expect(getBookName()).toBe('');
      expect(getAuthor()).toBe('');
      expect(getBookInfo()).toBeNull();
      expect(getMovieBudget()).toBe(0);
      expect(getCastingBudget()).toBe(0);
      expect(getSpentBudget()).toBe(0);
      expect(getCastList()).toEqual([]);
    });

    it('should not reset Firebase instances', () => {
      const mockApp = { name: 'test-app' };
      const mockDb = { type: 'firestore' };
      const mockAuth = { type: 'auth' };
      const mockUserId = 'user123';

      setFirebaseInstances(mockApp, mockDb, mockAuth, mockUserId);
      resetState();

      // Firebase instances should persist
      expect(getApp()).toEqual(mockApp);
      expect(getDb()).toEqual(mockDb);
      expect(getAuth()).toEqual(mockAuth);
      expect(getUserId()).toBe(mockUserId);
    });
  });

  describe('getState', () => {
    it('should return the complete state object', () => {
      const bookInfo = { characters: [] };
      updateBookInfo('Test', 'Author', bookInfo);
      updateBudgets(100, 50);

      const state = getState();

      expect(state).toHaveProperty('bookName');
      expect(state).toHaveProperty('author');
      expect(state).toHaveProperty('bookInfo');
      expect(state).toHaveProperty('movieBudget');
      expect(state).toHaveProperty('castingBudget');
      expect(state).toHaveProperty('spentBudget');
      expect(state).toHaveProperty('castList');
      expect(state).toHaveProperty('firebase');
    });
  });
});
