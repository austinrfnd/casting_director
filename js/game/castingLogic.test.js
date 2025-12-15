import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateSpentBudget,
  isOverBudget,
  allRolesCast,
} from './castingLogic.js';

// Mock dependencies
vi.mock('../services/stateService.js', () => ({
  getState: vi.fn(),
  getBookInfo: vi.fn(),
  getCastList: vi.fn(() => []),
  getCastingBudget: vi.fn(() => 10000000),
  updateCastMember: vi.fn(),
  updateSpentBudget: vi.fn(),
}));

vi.mock('../services/apiService.js', () => ({
  callGetActorFee: vi.fn(),
}));

vi.mock('../ui/screenManager.js', () => ({
  showLoading: vi.fn(),
}));

vi.mock('../ui/modalManager.js', () => ({
  showModal: vi.fn(),
}));

vi.mock('../utils/formatters.js', () => ({
  formatCurrency: vi.fn((num) => `$${num.toLocaleString()}`),
}));

import { getCastList, getCastingBudget } from '../services/stateService.js';

describe('castingLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateSpentBudget', () => {
    it('should return 0 for empty cast list', () => {
      getCastList.mockReturnValue([]);
      expect(calculateSpentBudget()).toBe(0);
    });

    it('should return 0 for cast list with all nulls', () => {
      getCastList.mockReturnValue([null, null, null]);
      expect(calculateSpentBudget()).toBe(0);
    });

    it('should sum fees from cast members', () => {
      getCastList.mockReturnValue([
        { character: 'Hero', actor: 'Actor 1', fee: 5000000, popularity: 'A-List' },
        { character: 'Villain', actor: 'Actor 2', fee: 3000000, popularity: 'B-List' },
        null, // Unfilled role
      ]);
      expect(calculateSpentBudget()).toBe(8000000);
    });

    it('should handle single cast member', () => {
      getCastList.mockReturnValue([
        { character: 'Hero', actor: 'Actor 1', fee: 1000000, popularity: 'C-List' },
      ]);
      expect(calculateSpentBudget()).toBe(1000000);
    });

    it('should handle all filled cast', () => {
      getCastList.mockReturnValue([
        { fee: 2000000 },
        { fee: 3000000 },
        { fee: 4000000 },
      ]);
      expect(calculateSpentBudget()).toBe(9000000);
    });
  });

  describe('isOverBudget', () => {
    it('should return false when under budget', () => {
      getCastList.mockReturnValue([
        { fee: 3000000 },
        { fee: 3000000 },
      ]);
      getCastingBudget.mockReturnValue(10000000);

      expect(isOverBudget()).toBe(false);
    });

    it('should return false when exactly at budget', () => {
      getCastList.mockReturnValue([
        { fee: 5000000 },
        { fee: 5000000 },
      ]);
      getCastingBudget.mockReturnValue(10000000);

      expect(isOverBudget()).toBe(false);
    });

    it('should return true when over budget', () => {
      getCastList.mockReturnValue([
        { fee: 6000000 },
        { fee: 6000000 },
      ]);
      getCastingBudget.mockReturnValue(10000000);

      expect(isOverBudget()).toBe(true);
    });

    it('should return false with empty cast', () => {
      getCastList.mockReturnValue([]);
      getCastingBudget.mockReturnValue(10000000);

      expect(isOverBudget()).toBe(false);
    });
  });

  describe('allRolesCast', () => {
    it('should return false for empty cast list', () => {
      getCastList.mockReturnValue([]);
      expect(allRolesCast()).toBe(false);
    });

    it('should return false when some roles are null', () => {
      getCastList.mockReturnValue([
        { character: 'Hero', actor: 'Actor 1' },
        null,
        { character: 'Sidekick', actor: 'Actor 2' },
      ]);
      expect(allRolesCast()).toBe(false);
    });

    it('should return false when all roles are null', () => {
      getCastList.mockReturnValue([null, null, null]);
      expect(allRolesCast()).toBe(false);
    });

    it('should return true when all roles are cast', () => {
      getCastList.mockReturnValue([
        { character: 'Hero', actor: 'Actor 1' },
        { character: 'Villain', actor: 'Actor 2' },
        { character: 'Sidekick', actor: 'Actor 3' },
      ]);
      expect(allRolesCast()).toBe(true);
    });

    it('should return true for single cast role', () => {
      getCastList.mockReturnValue([
        { character: 'Hero', actor: 'Actor 1' },
      ]);
      expect(allRolesCast()).toBe(true);
    });
  });
});
