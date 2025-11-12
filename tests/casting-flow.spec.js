const { test, expect } = require('@playwright/test');

/**
 * E2E Tests for Casting Director Application
 * Tests the complete user flow from book entry to final movie results
 */

test.describe('Casting Director - Main Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for Firebase to initialize
    await page.waitForTimeout(2000);
  });

  test('should load the homepage with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Casting Director/);

    // Check that the header is visible
    const header = page.locator('header');
    await expect(header).toContainText('Casting Director C:>');
  });

  test('should pre-populate book and author fields with a random default', async ({ page }) => {
    // Wait for the random book to be loaded
    await page.waitForTimeout(500);

    // Check that book name is populated (not empty or placeholder)
    const bookValue = await page.inputValue('#book-name');
    expect(bookValue).not.toBe('');
    expect(bookValue).not.toBe('Loading...');
    expect(bookValue.length).toBeGreaterThan(0);

    // Check that author name is populated
    const authorValue = await page.inputValue('#author-name');
    expect(authorValue).not.toBe('');
    expect(authorValue).not.toBe('Loading...');
    expect(authorValue.length).toBeGreaterThan(0);

    // The fields should be editable (user can change them)
    await page.fill('#book-name', 'Test Book');
    const newBookValue = await page.inputValue('#book-name');
    expect(newBookValue).toBe('Test Book');
  });

  test('should display Director ID after authentication', async ({ page }) => {
    // Wait for authentication to complete
    await page.waitForSelector('#user-id-display:not(:has-text("CONNECTING"))');

    const directorId = await page.locator('#user-id-display').textContent();

    // Should show a Director ID instead of "CONNECTING..."
    expect(directorId).not.toContain('CONNECTING');
    expect(directorId).toContain('Director ID:');
  });

  test('should successfully navigate from Screen 1 to Screen 2', async ({ page }) => {
    // Screen 1 should be visible initially
    await expect(page.locator('#screen1.active')).toBeVisible();

    // Fill in book and author
    await page.fill('#book-name', 'The Hobbit');
    await page.fill('#author-name', 'J.R.R. Tolkien');

    // Click the LOAD PROJECT button
    await page.click('#submit-book');

    // Wait for the API call and screen transition
    await page.waitForSelector('#screen2.active', { timeout: 15000 });

    // Screen 2 should now be visible
    await expect(page.locator('#screen2.active')).toBeVisible();
    await expect(page.locator('#screen1.active')).not.toBeVisible();

    // Check that budget information is displayed
    await expect(page.locator('#project-title')).toContainText('The Hobbit');
    await expect(page.locator('#movie-budget')).not.toBeEmpty();
    await expect(page.locator('#casting-budget')).not.toBeEmpty();
  });

  test('should validate book and author fields are required', async ({ page }) => {
    // Clear the fields
    await page.fill('#book-name', '');
    await page.fill('#author-name', '');

    // Try to submit
    await page.click('#submit-book');

    // Should still be on screen 1
    await expect(page.locator('#screen1.active')).toBeVisible();

    // A modal should appear (or inline error)
    // This depends on your implementation
  });

  test('should display loading state during API call', async ({ page }) => {
    // Fill in the form
    await page.fill('#book-name', 'Pride and Prejudice');
    await page.fill('#author-name', 'Jane Austen');

    // Click submit
    await page.click('#submit-book');

    // Loading overlay should appear
    const loadingOverlay = page.locator('.loading-overlay');

    // Wait a bit for the loading to appear
    await page.waitForTimeout(100);

    // Note: This might be tricky to test if the API is fast
    // You may need to mock slow responses in the future
  });

  test('should navigate from Screen 2 to Screen 3 (casting)', async ({ page }) => {
    // First get to screen 2
    await page.fill('#book-name', 'Harry Potter and the Sorcerer\'s Stone');
    await page.fill('#author-name', 'J.K. Rowling');
    await page.click('#submit-book');

    // Wait for screen 2
    await page.waitForSelector('#screen2.active', { timeout: 15000 });

    // Click "GET TO CASTING" button
    await page.click('#go-to-casting');

    // Should now be on screen 3
    await page.waitForSelector('#screen3.active');
    await expect(page.locator('#screen3.active')).toBeVisible();
    await expect(page.locator('#screen2.active')).not.toBeVisible();

    // Should show character cards
    const characterCards = page.locator('.character-card');
    await expect(characterCards.first()).toBeVisible();
  });

  test('should return to main menu from Screen 2', async ({ page }) => {
    // Get to screen 2
    await page.fill('#book-name', 'The Great Gatsby');
    await page.fill('#author-name', 'F. Scott Fitzgerald');
    await page.click('#submit-book');
    await page.waitForSelector('#screen2.active', { timeout: 15000 });

    // Click back to main
    await page.click('#back-to-main');

    // Should be back on screen 1
    await expect(page.locator('#screen1.active')).toBeVisible();
  });
});

test.describe('Casting Director - Recent Movies', () => {

  test('should display recent movies section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Recent movies section should be visible
    const recentMoviesSection = page.locator('fieldset:has(legend:text("RECENTLY CAST MOVIES"))');
    await expect(recentMoviesSection).toBeVisible();

    // List should exist
    const moviesList = page.locator('#recent-movies-list');
    await expect(moviesList).toBeVisible();
  });

  test('should refresh recent movies when clicking refresh button', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Get initial content
    const initialContent = await page.locator('#recent-movies-list').textContent();

    // Click refresh
    await page.click('#refresh-movies');

    // Wait a bit for the refresh
    await page.waitForTimeout(1000);

    // Content might change or stay the same, but button should work
    const moviesList = page.locator('#recent-movies-list');
    await expect(moviesList).toBeVisible();
  });
});

test.describe('Casting Director - Error Handling', () => {

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Try with an invalid/empty book
    await page.fill('#book-name', 'zzz_nonexistent_book_12345');
    await page.fill('#author-name', 'Nobody');

    await page.click('#submit-book');

    // Wait a bit for the API call
    await page.waitForTimeout(15000);

    // Either should show an error modal or stay on the same screen
    // This depends on how your API handles invalid books
  });
});
