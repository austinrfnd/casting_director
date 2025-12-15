import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Test environment (jsdom for DOM testing)
    environment: 'jsdom',

    // Include test files
    include: ['js/**/*.test.js'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['js/**/*.js'],
      exclude: [
        'js/**/*.test.js',
        'js/config/**',  // Configuration files don't need coverage
      ],
    },

    // Setup files (if needed for mocking browser APIs)
    // setupFiles: ['./test/setup.js'],
  },
});
