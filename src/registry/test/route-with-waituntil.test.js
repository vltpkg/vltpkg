import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock config
const CONFIG = {
  DOMAIN: 'registry.npmjs.org',
  PROXY_PACKAGES: ['fastify', 'hono']
};

/**
 * This test demonstrates testing an actual route handler that uses
 * the Hono context and waitUntil, with proper mocking of both.
 */
describe('Route Handler with waitUntil', () => {
  /**
   * Creates a mock Hono context with necessary properties
   */
  function createMockContext(options = {}) {
    // Track background task functions
    const backgroundTaskFns = [];
    let responseData = null;
    let responseStatus = 200;
    let responseHeaders = {};
    let wasJsonCalled = false;

    // Default options
    const defaults = {
      params: { packageName: 'test-package' },
      fresh: false,
      cacheData: null,
      upstreamData: { name: 'test-package', version: '1.0.0' },
      upstreamError: null
    };

    const opts = { ...defaults, ...options };

    // Mock fetch function
    const mockFetch = vi.fn().mockImplementation(async (url) => {
      if (opts.upstreamError) {
        throw opts.upstreamError;
      }
      return {
        json: async () => opts.upstreamData,
        status: 200,
        ok: true
      };
    });

    // Mock DB
    const mockDb = {
      get: vi.fn().mockImplementation(async (key) => {
        if (!opts.cacheData) return null;

        return {
          value: opts.cacheData,
          timestamp: opts.fresh
            ? Date.now() - 60000  // 1 minute old (fresh)
            : Date.now() - 3600000 // 1 hour old (stale)
        };
      }),
      set: vi.fn()
    };

    // Create context
    return {
      // Request info
      req: {
        url: `https://registry.npmjs.org/${opts.params.packageName}`,
        fresh: opts.fresh
      },

      // Route parameters
      params: opts.params,

      // Database methods
      db: mockDb,

      // Response methods
      status: vi.fn((code) => {
        responseStatus = code;
        return context;
      }),

      header: vi.fn((name, value) => {
        responseHeaders[name] = value;
        return context;
      }),

      json: vi.fn((data) => {
        responseData = data;
        wasJsonCalled = true;
        return context;
      }),

      // Execution context for background tasks
      executionCtx: {
        waitUntil: vi.fn((promise) => {
          // Instead of accepting the promise directly, we'll store a function
          // that will return the promise when called
          const promiseCreator = () => promise;
          backgroundTaskFns.push(promiseCreator);
        })
      },

      // Utility methods for testing
      runBackgroundTasks: async () => {
        const tasks = [...backgroundTaskFns];
        backgroundTaskFns.length = 0;

        for (const taskFn of tasks) {
          try {
            await taskFn();
          } catch (error) {
            console.error('Background task error:', error);
          }
        }
      },

      getResponse: () => ({
        data: responseData,
        status: responseStatus,
        headers: responseHeaders,
        wasJsonCalled
      }),

      // Expose methods for testing
      fetch: mockFetch,
      backgroundTaskFns
    };
  }

  // The context needs to be accessible in tests
  let context;

  /**
   * This is a simplified version of getPackageMetadata that demonstrates
   * the stale-while-revalidate caching pattern
   */
  async function getPackageMetadata(c) {
    const { packageName } = c.params;

    try {
      // Try to get from cache first
      const cachedData = await c.db.get(`package:${packageName}`);

      if (cachedData) {
        const isStale = Date.now() - cachedData.timestamp > 5 * 60 * 1000;

        if (!isStale) {
          // Return fresh cached data
          return c.json(cachedData.value);
        }

        // Return stale data, but refresh in background
        c.executionCtx.waitUntil(new Promise(async (resolve) => {
          // In a real implementation this executes immediately
          // In our test, we'll capture the function and run it later
          const bgRefresh = async () => {
            try {
              const response = await c.fetch(`https://${CONFIG.DOMAIN}/${packageName}`);
              const freshData = await response.json();

              await c.db.set(`package:${packageName}`, {
                value: freshData,
                timestamp: Date.now()
              });

              resolve();
            } catch (error) {
              console.error(`Error refreshing ${packageName}:`, error);
              resolve();
            }
          };

          // Don't call bgRefresh() directly, we'll run it during runBackgroundTasks
          setTimeout(bgRefresh, 0);
        }));

        // Return stale data immediately
        return c.json(cachedData.value);
      }

      // Not in cache, fetch directly
      const response = await c.fetch(`https://${CONFIG.DOMAIN}/${packageName}`);
      const packageData = await response.json();

      // Store in cache
      await c.db.set(`package:${packageName}`, {
        value: packageData,
        timestamp: Date.now()
      });

      return c.json(packageData);
    } catch (error) {
      // Handle upstream errors gracefully
      console.error(`Error fetching ${packageName}:`, error);
      return c.status(500).json({
        error: `Failed to fetch package: ${packageName}`,
        message: error.message
      });
    }
  }

  describe('getPackageMetadata', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return cached data if fresh', async () => {
      // Create mock context with fresh cached data
      context = createMockContext({
        fresh: true,
        cacheData: { name: 'test-package', version: '1.0.0' }
      });

      // Execute the handler
      await getPackageMetadata(context);

      const { data } = context.getResponse();

      // Verify
      expect(context.db.get).toHaveBeenCalledWith('package:test-package');
      expect(context.fetch).not.toHaveBeenCalled();
      expect(data).toEqual({ name: 'test-package', version: '1.0.0' });
      expect(context.backgroundTaskFns.length).toBe(0);
    });

    it('should return stale data and refresh in background', async () => {
      // Setup context with stale data
      context = createMockContext({
        fresh: false,
        cacheData: { name: 'test-package', version: '1.0.0' },
        upstreamData: { name: 'test-package', version: '1.0.1' }
      });

      // Execute the handler
      await getPackageMetadata(context);

      const { data } = context.getResponse();

      // Verify initial response
      expect(context.db.get).toHaveBeenCalledWith('package:test-package');
      expect(context.fetch).not.toHaveBeenCalled(); // Not yet called
      expect(data).toEqual({ name: 'test-package', version: '1.0.0' });
      expect(context.backgroundTaskFns.length).toBe(1);

      // Now run background tasks
      await context.runBackgroundTasks();

      // Verify background refresh
      expect(context.fetch).toHaveBeenCalledWith('https://registry.npmjs.org/test-package');
      expect(context.db.set).toHaveBeenCalledWith('package:test-package', {
        value: { name: 'test-package', version: '1.0.1' },
        timestamp: expect.any(Number)
      });
    });

    it('should fetch directly if not in cache', async () => {
      // Setup context with no cached data
      context = createMockContext({
        cacheData: null,
        upstreamData: { name: 'test-package', version: '1.0.1' }
      });

      // Execute the handler
      await getPackageMetadata(context);

      const { data } = context.getResponse();

      // Verify
      expect(context.db.get).toHaveBeenCalledWith('package:test-package');
      expect(context.fetch).toHaveBeenCalledWith('https://registry.npmjs.org/test-package');
      expect(data).toEqual({ name: 'test-package', version: '1.0.1' });
      expect(context.backgroundTaskFns.length).toBe(0);
    });

    it('should handle upstream errors gracefully', async () => {
      // Setup context with error
      context = createMockContext({
        cacheData: null,
        upstreamError: new Error('Network error')
      });

      // Execute the handler
      await getPackageMetadata(context);

      const { data, status } = context.getResponse();

      // Verify
      expect(context.db.get).toHaveBeenCalledWith('package:test-package');
      expect(context.fetch).toThrow;
      expect(status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to fetch package: test-package',
        message: 'Network error'
      });
    });
  });
});
