import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatLetterboxdStars,
  generateThumbIcon,
  getScoreColorClass,
} from './formatters.js';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers as US currency', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000');
      expect(formatCurrency(100)).toBe('$100');
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should handle decimal numbers', () => {
      expect(formatCurrency(1000.50)).toBe('$1,000.5');
      expect(formatCurrency(999.99)).toBe('$999.99');
    });

    it('should handle non-number inputs', () => {
      expect(formatCurrency('not a number')).toBe('$0');
      expect(formatCurrency(null)).toBe('$0');
      expect(formatCurrency(undefined)).toBe('$0');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-1000)).toBe('$-1,000');
    });
  });

  describe('formatLetterboxdStars', () => {
    it('should format whole number scores', () => {
      expect(formatLetterboxdStars(5)).toBe('★★★★★');
      expect(formatLetterboxdStars(4)).toBe('★★★★');
      expect(formatLetterboxdStars(3)).toBe('★★★');
      expect(formatLetterboxdStars(2)).toBe('★★');
      expect(formatLetterboxdStars(1)).toBe('★');
      expect(formatLetterboxdStars(0)).toBe('');
    });

    it('should add half star for scores between 0.25 and 0.75', () => {
      expect(formatLetterboxdStars(4.5)).toBe('★★★★½');
      expect(formatLetterboxdStars(3.25)).toBe('★★★½');
      expect(formatLetterboxdStars(2.7)).toBe('★★½');
    });

    it('should not add half star for scores below 0.25', () => {
      expect(formatLetterboxdStars(4.2)).toBe('★★★★');
      expect(formatLetterboxdStars(3.1)).toBe('★★★');
    });

    it('should not add half star for scores above 0.75', () => {
      expect(formatLetterboxdStars(4.8)).toBe('★★★★');
      expect(formatLetterboxdStars(3.9)).toBe('★★★');
    });

    it('should handle edge case of 0.5', () => {
      expect(formatLetterboxdStars(0.5)).toBe('½');
    });
  });

  describe('generateThumbIcon', () => {
    it('should return thumbs up emoji for thumbs_up verdict', () => {
      expect(generateThumbIcon('thumbs_up')).toBe('👍');
    });

    it('should return thumbs down emoji for thumbs_down verdict', () => {
      expect(generateThumbIcon('thumbs_down')).toBe('👎');
    });

    it('should return thumbs down for any other verdict', () => {
      expect(generateThumbIcon('unknown')).toBe('👎');
      expect(generateThumbIcon('')).toBe('👎');
      expect(generateThumbIcon(null)).toBe('👎');
    });
  });

  describe('getScoreColorClass', () => {
    it('should return score-exceptional for scores >= 90', () => {
      expect(getScoreColorClass(90)).toBe('score-exceptional');
      expect(getScoreColorClass(95)).toBe('score-exceptional');
      expect(getScoreColorClass(100)).toBe('score-exceptional');
    });

    it('should return score-great for scores 80-89', () => {
      expect(getScoreColorClass(80)).toBe('score-great');
      expect(getScoreColorClass(85)).toBe('score-great');
      expect(getScoreColorClass(89)).toBe('score-great');
    });

    it('should return score-good for scores 70-79', () => {
      expect(getScoreColorClass(70)).toBe('score-good');
      expect(getScoreColorClass(75)).toBe('score-good');
      expect(getScoreColorClass(79)).toBe('score-good');
    });

    it('should return score-decent for scores 60-69', () => {
      expect(getScoreColorClass(60)).toBe('score-decent');
      expect(getScoreColorClass(65)).toBe('score-decent');
      expect(getScoreColorClass(69)).toBe('score-decent');
    });

    it('should return score-mediocre for scores 50-59', () => {
      expect(getScoreColorClass(50)).toBe('score-mediocre');
      expect(getScoreColorClass(55)).toBe('score-mediocre');
      expect(getScoreColorClass(59)).toBe('score-mediocre');
    });

    it('should return score-poor for scores 40-49', () => {
      expect(getScoreColorClass(40)).toBe('score-poor');
      expect(getScoreColorClass(45)).toBe('score-poor');
      expect(getScoreColorClass(49)).toBe('score-poor');
    });

    it('should return score-disaster for scores below 40', () => {
      expect(getScoreColorClass(39)).toBe('score-disaster');
      expect(getScoreColorClass(20)).toBe('score-disaster');
      expect(getScoreColorClass(0)).toBe('score-disaster');
    });
  });
});
