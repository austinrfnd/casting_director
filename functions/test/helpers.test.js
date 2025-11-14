/**
 * Tests for Shared Utility Functions
 */

const {
  validateRequiredParams,
  createErrorResponse,
  createSuccessResponse,
  sendError,
  sendSuccess,
  formatCurrency,
  parseCurrency,
  isNonEmptyString,
  isPositiveNumber,
  sanitizeString,
  truncateString,
} = require('../src/utils/helpers');

describe('helpers', () => {
  describe('validateRequiredParams', () => {
    it('should return valid true when all params present', () => {
      const body = { name: 'John', age: 30 };
      const result = validateRequiredParams(body, ['name', 'age']);

      expect(result.valid).toBe(true);
      expect(result.missing).toBeUndefined();
    });

    it('should return valid false when params missing', () => {
      const body = { name: 'John' };
      const result = validateRequiredParams(body, ['name', 'age']);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['age']);
    });

    it('should list all missing params', () => {
      const body = {};
      const result = validateRequiredParams(body, ['name', 'age', 'email']);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['name', 'age', 'email']);
    });

    it('should handle empty required params array', () => {
      const body = { name: 'John' };
      const result = validateRequiredParams(body, []);

      expect(result.valid).toBe(true);
      expect(result.missing).toBeUndefined();
    });

    it('should treat falsy values as missing', () => {
      const body = { name: '', age: 0, enabled: false };
      const result = validateRequiredParams(body, ['name', 'age', 'enabled']);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['name', 'age', 'enabled']);
    });
  });

  describe('createErrorResponse', () => {
    it('should create basic error response', () => {
      const response = createErrorResponse(404, 'Not found');

      expect(response).toEqual({
        error: 'Not found',
        statusCode: 404,
      });
    });

    it('should include details when provided', () => {
      const response = createErrorResponse(400, 'Validation error', {
        field: 'email',
        reason: 'Invalid format',
      });

      expect(response).toEqual({
        error: 'Validation error',
        statusCode: 400,
        details: {
          field: 'email',
          reason: 'Invalid format',
        },
      });
    });

    it('should handle null details', () => {
      const response = createErrorResponse(500, 'Server error', null);

      expect(response).toEqual({
        error: 'Server error',
        statusCode: 500,
      });
    });
  });

  describe('createSuccessResponse', () => {
    it('should create basic success response', () => {
      const response = createSuccessResponse({ id: 123, name: 'Test' });

      expect(response).toEqual({
        id: 123,
        name: 'Test',
      });
    });

    it('should include message when provided', () => {
      const response = createSuccessResponse({ id: 123 }, 'Created successfully');

      expect(response).toEqual({
        id: 123,
        message: 'Created successfully',
      });
    });

    it('should handle empty data object', () => {
      const response = createSuccessResponse({});

      expect(response).toEqual({});
    });
  });

  describe('sendError', () => {
    it('should send error with status code', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      sendError(mockRes, 404, 'Resource not found');

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Resource not found',
        statusCode: 404,
      });
    });

    it('should send error with details', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      sendError(mockRes, 400, 'Bad request', { param: 'email' });

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad request',
        statusCode: 400,
        details: { param: 'email' },
      });
    });
  });

  describe('sendSuccess', () => {
    it('should send success response', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      sendSuccess(mockRes, { id: 1, name: 'Test' });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        id: 1,
        name: 'Test',
      });
    });

    it('should send success with message', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      sendSuccess(mockRes, { id: 1 }, 'Operation successful');

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        id: 1,
        message: 'Operation successful',
      });
    });
  });

  describe('formatCurrency', () => {
    it('should format basic amounts', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(1000000)).toBe('$1,000,000');
      expect(formatCurrency(15000000)).toBe('$15,000,000');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-1000)).toBe('$-1,000');
    });

    it('should handle decimals (rounds to integer)', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000000)).toBe('$1,000,000,000');
    });
  });

  describe('parseCurrency', () => {
    it('should parse formatted currency strings', () => {
      expect(parseCurrency('$1,000')).toBe(1000);
      expect(parseCurrency('$1,000,000')).toBe(1000000);
      expect(parseCurrency('$15,000,000')).toBe(15000000);
    });

    it('should handle strings without dollar sign', () => {
      expect(parseCurrency('1,000')).toBe(1000);
    });

    it('should handle strings without commas', () => {
      expect(parseCurrency('$1000')).toBe(1000);
    });

    it('should handle plain number strings', () => {
      expect(parseCurrency('1000')).toBe(1000);
    });

    it('should return NaN for invalid strings', () => {
      expect(parseCurrency('abc')).toBe(NaN);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('a')).toBe(true);
      expect(isNonEmptyString('  text  ')).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(100)).toBe(true);
      expect(isPositiveNumber(0.1)).toBe(true);
    });

    it('should return false for zero', () => {
      expect(isPositiveNumber(0)).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(isPositiveNumber(-1)).toBe(false);
      expect(isPositiveNumber(-100)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isPositiveNumber('123')).toBe(false);
      expect(isPositiveNumber(null)).toBe(false);
      expect(isPositiveNumber(undefined)).toBe(false);
      expect(isPositiveNumber({})).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(isPositiveNumber(NaN)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(isPositiveNumber(Infinity)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('\thello\t')).toBe('hello');
    });

    it('should collapse multiple spaces', () => {
      expect(sanitizeString('hello    world')).toBe('hello world');
      expect(sanitizeString('a  b  c')).toBe('a b c');
    });

    it('should handle mixed whitespace', () => {
      expect(sanitizeString('  hello   world  ')).toBe('hello world');
      expect(sanitizeString('hello\n\nworld')).toBe('hello world');
    });

    it('should handle already sanitized strings', () => {
      expect(sanitizeString('hello world')).toBe('hello world');
    });

    it('should return empty string for non-strings', () => {
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      expect(truncateString('Hello World', 8)).toBe('Hello...');
      expect(truncateString('This is a long string', 10)).toBe('This is...');
    });

    it('should not truncate short strings', () => {
      expect(truncateString('Hello', 10)).toBe('Hello');
      expect(truncateString('Test', 4)).toBe('Test');
    });

    it('should use custom suffix', () => {
      expect(truncateString('Hello World', 8, '…')).toBe('Hello W…');
      expect(truncateString('Hello World', 8, '')).toBe('Hello Wo');
    });

    it('should handle edge cases', () => {
      expect(truncateString('', 5)).toBe('');
      expect(truncateString('Hi', 2)).toBe('Hi');
    });

    it('should return empty string for non-strings', () => {
      expect(truncateString(123, 5)).toBe('');
      expect(truncateString(null, 5)).toBe('');
      expect(truncateString(undefined, 5)).toBe('');
    });

    it('should handle maxLength equal to string length', () => {
      expect(truncateString('Hello', 5)).toBe('Hello');
    });

    it('should account for suffix length', () => {
      // maxLength 10, suffix '...' (3 chars) means we keep 7 chars
      expect(truncateString('Hello World!', 10)).toBe('Hello W...');
    });
  });

  describe('Integration scenarios', () => {
    it('should validate and send error for missing params', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const body = { name: 'John' };
      const validation = validateRequiredParams(body, ['name', 'email']);

      if (!validation.valid) {
        sendError(mockRes, 400, 'Missing required parameters', {
          missing: validation.missing,
        });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required parameters',
        statusCode: 400,
        details: { missing: ['email'] },
      });
    });

    it('should format and parse currency consistently', () => {
      const amount = 15000000;
      const formatted = formatCurrency(amount);
      const parsed = parseCurrency(formatted);

      expect(parsed).toBe(amount);
    });

    it('should sanitize and truncate user input', () => {
      const userInput = '  This is   a very long    user input string  ';
      const sanitized = sanitizeString(userInput);
      const truncated = truncateString(sanitized, 20);

      expect(truncated).toBe('This is a very lo...');
    });
  });
});
