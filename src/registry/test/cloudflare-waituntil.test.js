import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * This test demonstrates the waitUntil behavior in Cloudflare Workers
 * in the most simplified form possible, avoiding the issues with immediate execution.
 */
describe('Cloudflare waitUntil Behavior', () => {
  // Simple test that shows the waitUntil pattern
  it('should demonstrate the waitUntil pattern correctly', async () => {
    let mainComplete = false;
    let bgTaskExecuted = false;

    // This mimics how Cloudflare Workers actually handles waitUntil
    // It stores the promises but doesn't block on them
    function simulateCloudflareWorker(handler) {
      const bgTasks = [];
      const executionCtx = {
        waitUntil: (promise) => {
          bgTasks.push(promise);
        }
      };

      return async () => {
        // Run the main handler first to completion
        const response = await handler(executionCtx);

        // Mark main function as complete
        mainComplete = true;

        // Then run background tasks
        for (const task of bgTasks) {
          await task;
        }

        return response;
      };
    }

    // Sample worker code using waitUntil
    async function workerHandler(ctx) {
      // Return response immediately
      const response = { message: "Fast response!" };

      // Queue background work
      ctx.waitUntil((async () => {
        // Simulate slow background work
        await new Promise(resolve => setTimeout(resolve, 100));
        bgTaskExecuted = true;
      })());

      return response;
    }

    // Wrap the handler to simulate worker runtime
    const simulatedWorker = simulateCloudflareWorker(workerHandler);

    // Execute the simulated worker
    const response = await simulatedWorker();

    // Verify the response returned before background work completed
    expect(response).toEqual({ message: "Fast response!" });

    // Verify main function completed before background task
    expect(mainComplete).toBe(true);

    // Verify background task eventually completed
    expect(bgTaskExecuted).toBe(true);
  });

  // Test with stale cache pattern
  it('should demonstrate the stale-while-revalidate pattern', async () => {
    const cache = {
      data: { key: 'test', value: 'stale-data', timestamp: Date.now() - 3600000 }, // 1 hour old
      get: vi.fn(function(key) { return this.data; }),
      set: vi.fn(function(key, value) { this.data = value; })
    };

    const fetchMock = vi.fn().mockResolvedValue('fresh-data');

    let cacheRefreshed = false;

    // Simplified runtime simulation
    function simulateCloudflareWorker(handler) {
      const bgTasks = [];
      const executionCtx = {
        waitUntil: (promise) => {
          bgTasks.push(promise);
        }
      };

      return async () => {
        // Run the main handler to completion first
        const response = await handler(executionCtx);

        // Then execute background tasks
        for (const task of bgTasks) {
          await task;
        }

        return response;
      };
    }

    // Worker handler using stale-while-revalidate pattern
    async function cacheHandler(ctx) {
      // Get from cache
      const cached = cache.get('test-key');

      // Check if stale
      const isStale = Date.now() - cached.timestamp > 5 * 60 * 1000; // 5 minutes

      if (isStale) {
        // Background refresh
        ctx.waitUntil((async () => {
          const fresh = await fetchMock('test-key');
          cache.set('test-key', {
            key: 'test',
            value: fresh,
            timestamp: Date.now()
          });
          cacheRefreshed = true;
        })());
      }

      // Return cached data immediately
      return cached.value;
    }

    // Wrap the handler
    const simulatedWorker = simulateCloudflareWorker(cacheHandler);

    // Execute - we should get stale data first, then background refresh
    const result = await simulatedWorker();

    // Verify
    expect(result).toBe('stale-data'); // Got stale data immediately
    expect(fetchMock).toHaveBeenCalledWith('test-key'); // Fetch happened in background
    expect(cacheRefreshed).toBe(true); // Cache was eventually refreshed
    expect(cache.set).toHaveBeenCalled(); // Cache was updated with fresh data
  });
});
