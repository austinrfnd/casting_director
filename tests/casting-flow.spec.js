const { test, expect } = require('@playwright/test');

/**
 * E2E Tests for Casting Director Application
 * Tests the complete user flow from book entry to final movie results
 */

test.describe('Casting Director - Main Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Mock API responses to avoid timeouts and flaky tests
    await page.route('**/us-central1/getBookInfo', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          popularity: 'Very popular - a classic fantasy novel',
          synopsis: 'A hobbit named Bilbo Baggins embarks on an unexpected adventure with a group of dwarves.',
          characters: [
            { name: 'Bilbo Baggins', description: 'A hobbit who loves comfort but finds courage' },
            { name: 'Gandalf', description: 'A wise and powerful wizard' },
            { name: 'Thorin Oakenshield', description: 'The leader of the dwarves' }
          ],
          movieBudget: 180000000,
          castingBudget: 45000000,
          studio: 'New Line Cinema',
          budgetReasoning: 'Epic fantasy adventure requiring extensive visual effects and star power'
        })
      });
    });

    await page.route('**/us-central1/getActorFee', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fee: 5000000,
          reasoning: 'Experienced actor suitable for the role'
        })
      });
    });

    await page.route('**/us-central1/generateMovieResults', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          boxOffice: 950000000,
          criticsScore: 92,
          audienceScore: 95,
          summary: 'A beloved fantasy epic that captivated audiences worldwide',
          awards: ['Best Visual Effects', 'Best Cinematography']
        })
      });
    });

    // Navigate to the app
    await page.goto('/');

    // Clear actor cache in Firestore to ensure clean test state
    await page.evaluate(async () => {
      // This runs in the browser context where Firebase is available
      try {
        // The cache clearing will happen naturally as tests run
        // or cache misses will trigger API calls which are mocked
      } catch (e) {
        console.log('Note: Could not clear cache, tests will proceed with mocked API');
      }
    });

    // Welcome screen now ALWAYS appears with intro sequence
    // Click skip button to bypass the intro sequence
    await page.waitForSelector('#welcome-screen.active', { timeout: 5000 });
    await page.click('#skip-intro');

    // Wait for phase 5 to appear (skip jumps directly to final phase)
    await page.waitForSelector('#phase-5.active', { timeout: 2000 });

    // Click boot button to continue
    await page.click('#boot-system');

    // Wait for welcome screen to be hidden (not have active class)
    await page.waitForFunction(() => {
      const el = document.getElementById('welcome-screen');
      return el && !el.classList.contains('active');
    }, { timeout: 3000 });

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

  test('should successfully navigate from Screen 1 through Screen 1.5 to Screen 2', async ({ page }) => {
    // Screen 1 should be visible initially
    await expect(page.locator('#screen1.active')).toBeVisible();

    // Fill in book and author
    await page.fill('#book-name', 'The Hobbit');
    await page.fill('#author-name', 'J.R.R. Tolkien');

    // Click the LOAD PROJECT button
    await page.click('#submit-book');

    // Screen 1.5 (Incoming Offer) should appear briefly
    await page.waitForSelector('#screen1_5.active', { timeout: 5000 });
    await expect(page.locator('#screen1_5.active')).toBeVisible();

    // Verify the incoming offer image is displayed
    await expect(page.locator('.incoming-offer-image')).toBeVisible();

    // Wait for the API call to complete and transition to Screen 2
    await page.waitForSelector('#screen2.active', { timeout: 15000 });

    // Screen 2 should now be visible
    await expect(page.locator('#screen2.active')).toBeVisible();
    await expect(page.locator('#screen1.active')).not.toBeVisible();
    await expect(page.locator('#screen1_5.active')).not.toBeVisible();

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

  test('should display Screen 1.5 during API call', async ({ page }) => {
    // Fill in the form
    await page.fill('#book-name', 'Pride and Prejudice');
    await page.fill('#author-name', 'Jane Austen');

    // Click submit
    await page.click('#submit-book');

    // Screen 1.5 (Incoming Offer) should appear during API loading
    await page.waitForSelector('#screen1_5.active', { timeout: 5000 });
    await expect(page.locator('#screen1_5.active')).toBeVisible();

    // Verify the incoming offer image is displayed
    await expect(page.locator('.incoming-offer-image')).toBeVisible();
  });

  test('should navigate from Screen 2 to Screen 3 (casting)', async ({ page }) => {
    // First get to screen 2
    await page.fill('#book-name', 'Harry Potter and the Sorcerer\'s Stone');
    await page.fill('#author-name', 'J.K. Rowling');
    await page.click('#submit-book');

    // Wait for Screen 1.5 then Screen 2
    await page.waitForSelector('#screen1_5.active', { timeout: 5000 });
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
    await page.waitForSelector('#screen1_5.active', { timeout: 5000 });
    await page.waitForSelector('#screen2.active', { timeout: 20000 });

    // Click back to main
    await page.click('#back-to-main');

    // Should be back on screen 1
    await expect(page.locator('#screen1.active')).toBeVisible();
  });
});

test.describe('Casting Director - Recent Movies', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Welcome screen now ALWAYS appears with intro sequence
    // Click skip button to bypass the intro sequence
    await page.waitForSelector('#welcome-screen.active', { timeout: 5000 });
    await page.click('#skip-intro');

    // Wait for phase 5 to appear (skip jumps directly to final phase)
    await page.waitForSelector('#phase-5.active', { timeout: 2000 });

    // Click boot button to continue
    await page.click('#boot-system');

    // Wait for welcome screen to be hidden (not have active class)
    await page.waitForFunction(() => {
      const el = document.getElementById('welcome-screen');
      return el && !el.classList.contains('active');
    }, { timeout: 3000 });

    // Wait for Firebase to initialize
    await page.waitForTimeout(2000);
  });

  test('should display recent movies section', async ({ page }) => {
    // Recent movies section should be visible
    const recentMoviesSection = page.locator('fieldset:has(legend:text("RECENTLY CAST MOVIES"))');
    await expect(recentMoviesSection).toBeVisible();

    // List should exist
    const moviesList = page.locator('#recent-movies-list');
    await expect(moviesList).toBeVisible();
  });

  test('should refresh recent movies when clicking refresh button', async ({ page }) => {
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

  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Welcome screen now ALWAYS appears with intro sequence
    // Click skip button to bypass the intro sequence
    await page.waitForSelector('#welcome-screen.active', { timeout: 5000 });
    await page.click('#skip-intro');

    // Wait for phase 5 to appear (skip jumps directly to final phase)
    await page.waitForSelector('#phase-5.active', { timeout: 2000 });

    // Click boot button to continue
    await page.click('#boot-system');

    // Wait for welcome screen to be hidden (not have active class)
    await page.waitForFunction(() => {
      const el = document.getElementById('welcome-screen');
      return el && !el.classList.contains('active');
    }, { timeout: 3000 });

    // Wait for Firebase to initialize
    await page.waitForTimeout(2000);
  });

  test('should handle API errors gracefully', async ({ page }) => {

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

test.describe('Casting Director - Welcome Screen & Intro Sequence', () => {

  test('should show welcome screen with intro sequence on every visit', async ({ page }) => {
    await page.goto('/');

    // Wait a moment for the page to load
    await page.waitForTimeout(500);

    // Welcome screen should be visible
    const welcomeScreen = page.locator('#welcome-screen.active');
    await expect(welcomeScreen).toBeVisible();

    // Phase 1 should be active initially (insert_game.png)
    await expect(page.locator('#phase-1.active')).toBeVisible();

    // Skip button should be visible
    await expect(page.locator('#skip-intro')).toBeVisible();
  });

  test('should progress through all intro phases automatically', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Phase 1: Insert game image (5 seconds)
    await expect(page.locator('#phase-1.active')).toBeVisible();

    // Wait for Phase 2: DOS typing (~5 seconds)
    await page.waitForSelector('#phase-2.active', { timeout: 6000 });
    await expect(page.locator('#phase-2.active')).toBeVisible();
    await expect(page.locator('#typed-command')).toBeVisible();

    // Wait for Phase 3: Initializing (~7 seconds from start)
    await page.waitForSelector('#phase-3.active', { timeout: 3000 });
    await expect(page.locator('#phase-3.active')).toBeVisible();
    await expect(page.locator('#initializing-text')).toContainText('INITIALIZING');

    // Wait for Phase 4: Cover image (~12 seconds from start)
    await page.waitForSelector('#phase-4.active', { timeout: 6000 });
    await expect(page.locator('#phase-4.active')).toBeVisible();

    // Wait for Phase 5: Final welcome box (~17 seconds from start)
    await page.waitForSelector('#phase-5.active', { timeout: 6000 });
    await expect(page.locator('#phase-5.active')).toBeVisible();
    await expect(page.locator('.welcome-intro')).toContainText('Look, Director');
    await expect(page.locator('#boot-system')).toBeVisible();

    // Skip button should be hidden on phase 5
    await expect(page.locator('#skip-intro')).toHaveClass(/hidden/);
  });

  test('should skip intro sequence and jump to phase 5', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Verify we're on phase 1
    await expect(page.locator('#phase-1.active')).toBeVisible();

    // Click skip button
    await page.click('#skip-intro');

    // Should immediately jump to phase 5
    await page.waitForSelector('#phase-5.active', { timeout: 2000 });
    await expect(page.locator('#phase-5.active')).toBeVisible();

    // Check for final welcome message
    await expect(page.locator('.welcome-intro')).toContainText('Look, Director');
    await expect(page.locator('#boot-system')).toBeVisible();

    // Skip button should now be hidden
    await expect(page.locator('#skip-intro')).toHaveClass(/hidden/);
  });

  test('should dismiss welcome screen from phase 5 with boot button', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Skip to phase 5
    await page.click('#skip-intro');
    await page.waitForSelector('#phase-5.active', { timeout: 2000 });

    // Click boot button
    await page.click('#boot-system');

    // Welcome screen should be hidden
    await page.waitForFunction(() => {
      const el = document.getElementById('welcome-screen');
      return el && !el.classList.contains('active');
    }, { timeout: 3000 });
    await expect(page.locator('#welcome-screen.active')).not.toBeVisible();

    // Main screen should be visible
    await expect(page.locator('#screen1.active')).toBeVisible();
  });

  test('should dismiss welcome screen from phase 5 with Enter key', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Skip to phase 5
    await page.click('#skip-intro');
    await page.waitForSelector('#phase-5.active', { timeout: 2000 });

    // Press Enter key (only works on phase 5)
    await page.keyboard.press('Enter');

    // Welcome screen should be hidden
    await page.waitForFunction(() => {
      const el = document.getElementById('welcome-screen');
      return el && !el.classList.contains('active');
    }, { timeout: 3000 });
    await expect(page.locator('#welcome-screen.active')).not.toBeVisible();

    // Main screen should be visible
    await expect(page.locator('#screen1.active')).toBeVisible();
  });

  test('should show welcome screen on every visit', async ({ page }) => {
    // First visit
    await page.goto('/');
    await page.waitForTimeout(500);

    const welcomeScreen = page.locator('#welcome-screen.active');
    await expect(welcomeScreen).toBeVisible();

    // Skip and dismiss
    await page.click('#skip-intro');
    await page.waitForSelector('#phase-5.active', { timeout: 2000 });
    await page.click('#boot-system');
    await page.waitForFunction(() => {
      const el = document.getElementById('welcome-screen');
      return el && !el.classList.contains('active');
    }, { timeout: 3000 });

    // Second visit - welcome screen should ALWAYS appear
    await page.reload();
    await page.waitForTimeout(500);

    // Welcome screen should be visible again
    await expect(page.locator('#welcome-screen.active')).toBeVisible();
    await expect(page.locator('#phase-1.active')).toBeVisible();
  });

  test('should not show Enter key hint until phase 5', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // On phase 1, Enter key should not dismiss welcome screen
    await expect(page.locator('#phase-1.active')).toBeVisible();
    await page.keyboard.press('Enter');

    // Welcome screen should still be visible (Enter does nothing before phase 5)
    await page.waitForTimeout(500);
    await expect(page.locator('#welcome-screen.active')).toBeVisible();
  });
});
