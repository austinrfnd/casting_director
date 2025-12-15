import { describe, it, expect } from 'vitest';
import {
  calculateProfit,
  isProfitable,
  getProfitColor,
  processMovieResults,
  getVerdictDisplay,
} from './movieResults.js';

describe('movieResults', () => {
  describe('calculateProfit', () => {
    it('should return positive profit when box office exceeds budget', () => {
      expect(calculateProfit(150000000, 100000000)).toBe(50000000);
    });

    it('should return zero when box office equals budget', () => {
      expect(calculateProfit(100000000, 100000000)).toBe(0);
    });

    it('should return negative profit (loss) when budget exceeds box office', () => {
      expect(calculateProfit(50000000, 100000000)).toBe(-50000000);
    });
  });

  describe('isProfitable', () => {
    it('should return true when profitable', () => {
      expect(isProfitable(150000000, 100000000)).toBe(true);
    });

    it('should return true when exactly break even', () => {
      expect(isProfitable(100000000, 100000000)).toBe(true);
    });

    it('should return false when not profitable', () => {
      expect(isProfitable(50000000, 100000000)).toBe(false);
    });
  });

  describe('getProfitColor', () => {
    it('should return green for positive profit', () => {
      expect(getProfitColor(50000000)).toBe('var(--dos-green)');
    });

    it('should return green for zero profit', () => {
      expect(getProfitColor(0)).toBe('var(--dos-green)');
    });

    it('should return error color for negative profit', () => {
      expect(getProfitColor(-50000000)).toBe('var(--dos-error)');
    });
  });

  describe('processMovieResults', () => {
    it('should add computed fields to results', () => {
      const results = {
        boxOffice: 150000000,
        awards: ['Best Picture'],
        summary: 'A great movie',
      };

      const processed = processMovieResults(results, 100000000);

      expect(processed.boxOffice).toBe(150000000);
      expect(processed.awards).toEqual(['Best Picture']);
      expect(processed.profit).toBe(50000000);
      expect(processed.profitColor).toBe('var(--dos-green)');
      expect(processed.isProfitable).toBe(true);
    });

    it('should handle loss scenario', () => {
      const results = {
        boxOffice: 50000000,
        summary: 'A flop',
      };

      const processed = processMovieResults(results, 100000000);

      expect(processed.profit).toBe(-50000000);
      expect(processed.profitColor).toBe('var(--dos-error)');
      expect(processed.isProfitable).toBe(false);
    });
  });

  describe('getVerdictDisplay', () => {
    it('should return positive display for recommended', () => {
      const display = getVerdictDisplay('recommended');
      expect(display.text).toBe('✅ RECOMMENDED');
      expect(display.className).toContain('verdict-positive');
    });

    it('should return negative display for not_recommended', () => {
      const display = getVerdictDisplay('not_recommended');
      expect(display.text).toBe('❌ NOT RECOMMENDED');
      expect(display.className).toContain('verdict-negative');
    });

    it('should return mixed display for other values', () => {
      const display = getVerdictDisplay('split');
      expect(display.text).toBe('⚠️ MIXED RECEPTION');
      expect(display.className).toContain('verdict-mixed');
    });

    it('should return mixed display for undefined', () => {
      const display = getVerdictDisplay(undefined);
      expect(display.text).toBe('⚠️ MIXED RECEPTION');
    });
  });
});
