/**
 * Shared Utility Functions
 *
 * Provides common validation, formatting, and error handling utilities
 * used across Cloud Functions.
 */

/**
 * Validates that required parameters are present in request body
 * @param {object} body - Request body
 * @param {string[]} requiredParams - Array of required parameter names
 * @returns {object} Validation result { valid: boolean, missing?: string[] }
 */
function validateRequiredParams(body, requiredParams) {
  const missing = requiredParams.filter((param) => !body[param]);

  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
  };
}

/**
 * Creates a standardized error response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {object} details - Optional error details
 * @returns {object} Error response object
 */
function createErrorResponse(statusCode, message, details = null) {
  const response = {
    error: message,
    statusCode,
  };

  if (details) {
    response.details = details;
  }

  return response;
}

/**
 * Creates a standardized success response
 * @param {object} data - Response data
 * @param {string} message - Optional success message
 * @returns {object} Success response object
 */
function createSuccessResponse(data, message = null) {
  const response = { ...data };

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Sends error response with proper status code
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {object} details - Optional error details
 */
function sendError(res, statusCode, message, details = null) {
  res.status(statusCode).json(createErrorResponse(statusCode, message, details));
}

/**
 * Sends success response with data
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {string} message - Optional success message
 */
function sendSuccess(res, data, message = null) {
  res.status(200).json(createSuccessResponse(data, message));
}

/**
 * Formats a number as currency (USD)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string (e.g., "$1,500,000")
 */
function formatCurrency(amount) {
  return `$${amount.toLocaleString('en-US')}`;
}

/**
 * Parses currency string to number
 * @param {string} currencyString - Currency string (e.g., "$1,500,000")
 * @returns {number} Parsed number
 */
function parseCurrency(currencyString) {
  return parseInt(currencyString.replace(/[$,]/g, ''), 10);
}

/**
 * Checks if a value is a non-empty string
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a non-empty string
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks if a value is a positive number
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a positive number
 */
function isPositiveNumber(value) {
  return typeof value === 'number' && value > 0 && !isNaN(value) && isFinite(value);
}

/**
 * Sanitizes a string by trimming and removing extra whitespace
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Truncates a string to a maximum length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string} Truncated string
 */
function truncateString(str, maxLength, suffix = '...') {
  if (typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

module.exports = {
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
};
