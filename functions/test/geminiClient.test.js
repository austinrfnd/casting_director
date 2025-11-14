/**
 * Tests for Gemini API Client Service
 */

const { callGeminiAPI, callGeminiProAPI } = require('../src/services/geminiClient');

// Mock fetch globally
global.fetch = jest.fn();

describe('geminiClient', () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    jest.useRealTimers();
  });

  const mockApiKey = 'test-api-key-12345';
  const mockUserQuery = 'Test query';
  const mockSystemPrompt = 'Test system prompt';
  const mockJsonSchema = {
    type: 'object',
    properties: {
      result: { type: 'string' }
    }
  };

  const mockSuccessResponse = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({ result: 'success' })
        }]
      }
    }]
  };

  describe('callGeminiAPI', () => {
    it('should successfully call API with default Flash model', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse
      });

      const result = await callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      expect(result).toEqual({ result: 'success' });
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.5-flash:generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should successfully call API with Pro model when specified', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse
      });

      const result = await callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema,
        'gemini-2.5-pro'
      );

      expect(result).toEqual({ result: 'success' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.5-pro:generateContent'),
        expect.any(Object)
      );
    });

    it('should include correct payload structure', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse
      });

      await callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      const callArgs = fetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload).toEqual({
        contents: [{
          parts: [{ text: mockUserQuery }]
        }],
        systemInstruction: {
          parts: [{ text: mockSystemPrompt }]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: mockJsonSchema
        }
      });
    });

    it('should retry on 500 server error with exponential backoff', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse
        });

      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      // Fast-forward through first retry delay
      await jest.advanceTimersByTimeAsync(3000);
      // Fast-forward through second retry delay
      await jest.advanceTimersByTimeAsync(5000);

      const result = await promise;

      expect(result).toEqual({ result: 'success' });
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying in')
      );
    });

    it('should use longer base delay for 503 errors', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse
        });

      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      // 503 should use 3s base delay instead of 2s
      await jest.advanceTimersByTimeAsync(4000);

      const result = await promise;

      expect(result).toEqual({ result: 'success' });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying in')
      );
    });

    it('should retry on 429 rate limit error', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse
        });

      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      await jest.advanceTimersByTimeAsync(3000);

      const result = await promise;

      expect(result).toEqual({ result: 'success' });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 400 client error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      await expect(
        callGeminiAPI(mockApiKey, mockUserQuery, mockSystemPrompt, mockJsonSchema)
      ).rejects.toThrow('HTTP error! status: 400 (non-retryable)');

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 404 not found error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(
        callGeminiAPI(mockApiKey, mockUserQuery, mockSystemPrompt, mockJsonSchema)
      ).rejects.toThrow('HTTP error! status: 404 (non-retryable)');

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries on 500 errors', async () => {
      // Mock all 6 attempts
      for (let i = 0; i < 6; i++) {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 500
        });
      }

      // Start the promise and advance timers simultaneously
      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      // Combine timer advancement with error expectation
      const testPromise = expect(promise).rejects.toThrow(/API call failed.*500/i);

      await jest.runAllTimersAsync();
      await testPromise;

      expect(fetch).toHaveBeenCalledTimes(6);
    });

    it('should retry on network errors', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse
        });

      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      await jest.advanceTimersByTimeAsync(3000);

      const result = await promise;

      expect(result).toEqual({ result: 'success' });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network error, retrying in')
      );
    });

    it('should throw error after max retries on network errors', async () => {
      // Mock all 6 attempts
      for (let i = 0; i < 6; i++) {
        fetch.mockRejectedValueOnce(new Error('Network error'));
      }

      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      const testPromise = expect(promise).rejects.toThrow(/API call failed.*Network error/i);

      await jest.runAllTimersAsync();
      await testPromise;

      expect(fetch).toHaveBeenCalledTimes(6);
    });

    it('should throw error on invalid response structure (missing candidates)', async () => {
      // Mock 6 invalid responses to trigger max retries
      for (let i = 0; i < 6; i++) {
        fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ candidates: [] })
        });
      }

      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      const testPromise = expect(promise).rejects.toThrow(/API call failed/i);

      await jest.runAllTimersAsync();
      await testPromise;

      expect(fetch).toHaveBeenCalledTimes(6);
    });

    it('should throw error on invalid response structure (missing content)', async () => {
      // Mock 6 invalid responses to trigger max retries
      for (let i = 0; i < 6; i++) {
        fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ content: null }]
          })
        });
      }

      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      const testPromise = expect(promise).rejects.toThrow(/API call failed/i);

      await jest.runAllTimersAsync();
      await testPromise;

      expect(fetch).toHaveBeenCalledTimes(6);
    });

    it('should throw error on invalid response structure (missing parts)', async () => {
      // Mock 6 invalid responses to trigger max retries
      for (let i = 0; i < 6; i++) {
        fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{
              content: { parts: [] }
            }]
          })
        });
      }

      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      const testPromise = expect(promise).rejects.toThrow(/API call failed/i);

      await jest.runAllTimersAsync();
      await testPromise;

      expect(fetch).toHaveBeenCalledTimes(6);
    });

    it('should parse JSON from API response text', async () => {
      const complexResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                result: 'complex',
                nested: { value: 123 }
              })
            }]
          }
        }]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => complexResponse
      });

      const result = await callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      expect(result).toEqual({
        result: 'complex',
        nested: { value: 123 }
      });
    });

    it('should log error details on API failures', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      await jest.advanceTimersByTimeAsync(3000);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'API Call Error: HTTP 500 for model gemini-2.5-flash'
      );
    });

    it('should include model name in API URL', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse
      });

      await callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema,
        'gemini-custom-model'
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-custom-model:generateContent'),
        expect.any(Object)
      );
    });

    it('should include API key in URL', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse
      });

      await callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`key=${mockApiKey}`),
        expect.any(Object)
      );
    });

    it('should implement exponential backoff correctly', async () => {
      fetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse
        });

      const promise = callGeminiAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      // First retry: ~2-3s (base 2s + jitter)
      await jest.advanceTimersByTimeAsync(3000);
      // Second retry: ~4-5s (base 4s + jitter)
      await jest.advanceTimersByTimeAsync(5000);
      // Third retry: ~8-9s (base 8s + jitter)
      await jest.advanceTimersByTimeAsync(9000);

      const result = await promise;

      expect(result).toEqual({ result: 'success' });
      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('callGeminiProAPI', () => {
    it('should call callGeminiAPI with Pro model', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse
      });

      const result = await callGeminiProAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      expect(result).toEqual({ result: 'success' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.5-pro:generateContent'),
        expect.any(Object)
      );
    });

    it('should pass through all parameters correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse
      });

      await callGeminiProAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      const callArgs = fetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload.contents[0].parts[0].text).toBe(mockUserQuery);
      expect(payload.systemInstruction.parts[0].text).toBe(mockSystemPrompt);
      expect(payload.generationConfig.responseSchema).toEqual(mockJsonSchema);
    });

    it('should handle retries with Pro model', async () => {
      fetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSuccessResponse
        });

      const promise = callGeminiProAPI(
        mockApiKey,
        mockUserQuery,
        mockSystemPrompt,
        mockJsonSchema
      );

      await jest.advanceTimersByTimeAsync(3000);

      const result = await promise;

      expect(result).toEqual({ result: 'success' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'API Call Error: HTTP 500 for model gemini-2.5-pro'
      );
    });
  });
});
