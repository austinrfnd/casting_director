const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Casting Director e2e tests
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',

  // Maximum time one test can run for
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: false, // Run tests sequentially to avoid API rate limits
  forbidOnly: !!process.env.CI, // Fail build on CI if you left test.only in source
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  // Reporter configuration
  reporter: [
    ['html'],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'https://casting-director-1990.web.app',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Default timeout for actions
    actionTimeout: 15000,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before starting tests (optional)
  // webServer: {
  //   command: 'firebase serve',
  //   url: 'http://127.0.0.1:5000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
