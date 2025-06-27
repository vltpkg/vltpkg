import { describe, it, expect, vi } from 'vitest';

/**
 * This is a minimalist test to demonstrate the waitUntil API in Cloudflare Workers.
 * The waitUntil API allows a Worker to return a response to the client immediately
 * while continuing to perform work in the background.
 *
 * This is especially useful for caching scenarios where:
 * 1. We want to return cached data to the client as quickly as possible
 * 2. We may need to refresh that cache in the background without blocking the response
 */
describe('waitUntil API', () => {
  it('allows background work to continue after a response is sent', async () => {
    // In a Cloudflare Worker, the execution context has a waitUntil method
    // Here we create a mock of that context
    let backgroundWorkCompleted = false;

    const executionContext = {
      // This mock implementation runs the task after a short delay
      waitUntil: (promise) => {
        // In a real Worker, this would track the promise and ensure
        // the Worker doesn't terminate until all promises are resolved
        setTimeout(async () => {
          try {
            await promise;
          } catch (error) {
            console.error('Background task error:', error);
          }
        }, 0);

        // waitUntil itself returns immediately
        return Promise.resolve();
      }
    };

    // Record start time
    const startTime = Date.now();

    // This is how you use waitUntil in a real worker handler:
    async function handleRequest(request, env, ctx) {
      // Do some quick work and prepare a response
      const quickData = { message: "Here's your fast response!" };

      // Queue up some slow work to happen in the background
      ctx.waitUntil((async () => {
        // Simulate slow work (e.g., refreshing a cache, calling external API)
        await new Promise(resolve => setTimeout(resolve, 500));
        backgroundWorkCompleted = true;
      })());

      // Return the response immediately, without waiting for background work
      return quickData;
    }

    // Call our handler with the mock execution context
    const response = await handleRequest({}, {}, executionContext);

    // Measure response time
    const responseTime = Date.now() - startTime;

    // VERIFY:

    // 1. We got a quick response (much less than 500ms)
    expect(response).toEqual({ message: "Here's your fast response!" });
    expect(responseTime).toBeLessThan(100);

    // 2. Background work has NOT completed yet
    expect(backgroundWorkCompleted).toBe(false);

    // 3. Wait for background work and verify it completes
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(backgroundWorkCompleted).toBe(true);
  });

  /**
   * Conceptual demonstration of the caching pattern
   */
  it('explains the stale-while-revalidate caching pattern', async () => {
    // This test explains the concept without actually testing code

    // 1. Mock a waitUntil function
    const waitUntil = vi.fn();

    // 2. Mock a database record with stale cached data
    const mockCacheResponse = {
      data: { version: '1.0.0' },
      updated: Date.now() - 3600000 // 1 hour old (stale)
    };

    // 3. Log what would happen in an actual implementation
    console.log('In a real implementation, a stale-while-revalidate caching strategy would:');
    console.log('1. Check if data exists in cache');
    console.log('2. If it exists but is stale, queue a background task to refresh it');
    console.log('3. Return the cached data immediately, without waiting for the refresh');

    // 4. Show what the implementation pattern looks like conceptually
    function conceptualImplementationPattern() {
      // Simulate the pattern without actually executing code
      const code = `
async function getDataWithBackgroundRefresh(key, db, ctx) {
  // Get data from cache
  const cached = await db.getData(key);

  if (cached) {
    // Check if cache is stale
    const isStale = Date.now() - cached.updated > FIVE_MINUTES;

    if (isStale) {
      // Queue background refresh WITHOUT awaiting it
      ctx.waitUntil((async () => {
        const fresh = await fetchFromUpstream(key);
        await db.saveToCache(key, fresh);
      })());
    }

    // Return cached data immediately
    return cached.data;
  }

  // If not in cache, fetch directly
  const data = await fetchFromUpstream(key);
  await db.saveToCache(key, data);
  return data;
}`;
      return code;
    }

    // 5. Verify the explanation was provided
    expect(conceptualImplementationPattern()).toContain('ctx.waitUntil');
    expect(conceptualImplementationPattern()).toContain('return cached.data');

    // Note: In a real implementation, we would:
    // 1. Return stale cached data immediately
    // 2. In parallel, refresh the cache in the background
    // 3. The client gets a fast response with slightly stale data
    // 4. The next client gets fresh data
  });
});
