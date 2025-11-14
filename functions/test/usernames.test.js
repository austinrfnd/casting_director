/**
 * Tests for 90s Usernames Configuration
 */

const { USERNAMES_90S, getRandomUsername } = require('../src/config/usernames');

describe('usernames', () => {
  describe('USERNAMES_90S', () => {
    it('should be an array', () => {
      expect(Array.isArray(USERNAMES_90S)).toBe(true);
    });

    it('should have at least 80 usernames', () => {
      expect(USERNAMES_90S.length).toBeGreaterThanOrEqual(80);
    });

    it('should contain only strings', () => {
      USERNAMES_90S.forEach((username) => {
        expect(typeof username).toBe('string');
      });
    });

    it('should not have empty strings', () => {
      USERNAMES_90S.forEach((username) => {
        expect(username.length).toBeGreaterThan(0);
      });
    });

    it('should not have duplicate usernames', () => {
      const uniqueUsernames = new Set(USERNAMES_90S);
      expect(uniqueUsernames.size).toBe(USERNAMES_90S.length);
    });

    it('should include xX format usernames', () => {
      const xXUsernames = USERNAMES_90S.filter((u) => u.startsWith('xX') && u.endsWith('Xx'));
      expect(xXUsernames.length).toBeGreaterThan(0);
    });

    it('should include underscore style usernames', () => {
      const underscoreUsernames = USERNAMES_90S.filter((u) => u.includes('_'));
      expect(underscoreUsernames.length).toBeGreaterThan(0);
    });

    it('should include leetspeak usernames', () => {
      const leetspeakPattern = /[0-9]/;
      const leetspeakUsernames = USERNAMES_90S.filter((u) => {
        // Check for number replacements typical of leetspeak
        return leetspeakPattern.test(u) && (u.includes('3') || u.includes('1') || u.includes('4'));
      });
      expect(leetspeakUsernames.length).toBeGreaterThan(0);
    });

    it('should include pop culture references', () => {
      const popCultureUsernames = USERNAMES_90S.filter(
        (u) =>
          u.includes('Titanic') ||
          u.includes('Jurassic') ||
          u.includes('Matrix') ||
          u.includes('StarWars') ||
          u.includes('Buffy')
      );
      expect(popCultureUsernames.length).toBeGreaterThan(0);
    });

    it('should include genre-specific usernames', () => {
      const genreUsernames = USERNAMES_90S.filter(
        (u) =>
          u.includes('Horror') ||
          u.includes('RomCom') ||
          u.includes('SciFi') ||
          u.includes('Action') ||
          u.includes('Indie')
      );
      expect(genreUsernames.length).toBeGreaterThan(0);
    });

    it('should include tech/gaming references', () => {
      const techUsernames = USERNAMES_90S.filter(
        (u) =>
          u.includes('AOL') ||
          u.includes('ICQ') ||
          u.includes('Napster') ||
          u.includes('MSN') ||
          u.includes('Yahoo')
      );
      expect(techUsernames.length).toBeGreaterThan(0);
    });
  });

  describe('getRandomUsername', () => {
    it('should return a string', () => {
      const username = getRandomUsername();
      expect(typeof username).toBe('string');
    });

    it('should return a username from the pool', () => {
      const username = getRandomUsername();
      expect(USERNAMES_90S).toContain(username);
    });

    it('should return different usernames on multiple calls (probabilistic)', () => {
      const usernames = new Set();

      // Get 20 random usernames
      for (let i = 0; i < 20; i++) {
        usernames.add(getRandomUsername());
      }

      // With 80+ usernames, we should get at least a few different ones
      expect(usernames.size).toBeGreaterThan(1);
    });

    it('should work consistently', () => {
      for (let i = 0; i < 10; i++) {
        const username = getRandomUsername();
        expect(USERNAMES_90S).toContain(username);
      }
    });

    it('should never return undefined', () => {
      for (let i = 0; i < 10; i++) {
        const username = getRandomUsername();
        expect(username).toBeDefined();
        expect(username).not.toBeNull();
      }
    });
  });

  describe('Username quality checks', () => {
    it('should have authentic 90s feel', () => {
      // Check for common 90s patterns
      const patterns = [
        /xX.*Xx/, // xX format
        /_/, // Underscores
        /\d{2,4}$/, // Year numbers at end
        /[0-9]{1,2}/, // Numbers mixed in
        /Fan|Lover|Master|King|Queen/, // Common suffixes
      ];

      const matchingUsernames = USERNAMES_90S.filter((username) => {
        return patterns.some((pattern) => pattern.test(username));
      });

      // At least 90% should match one of these patterns
      expect(matchingUsernames.length).toBeGreaterThanOrEqual(USERNAMES_90S.length * 0.9);
    });

    it('should not have spaces', () => {
      USERNAMES_90S.forEach((username) => {
        expect(username).not.toMatch(/\s/);
      });
    });

    it('should have reasonable length', () => {
      USERNAMES_90S.forEach((username) => {
        expect(username.length).toBeGreaterThanOrEqual(3);
        expect(username.length).toBeLessThanOrEqual(30);
      });
    });
  });
});
