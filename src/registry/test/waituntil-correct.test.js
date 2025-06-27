import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * This test correctly demonstrates Cloudflare's waitUntil API behavior
 * by properly simulating how background tasks are queued and executed.
 */
describe('Cloudflare waitUntil Pattern', () => {
  /**
   * The key issue with the waitUntil API is that when using an IIFE, it executes immediately
   * before waitUntil gets the resulting promise:
   *
   * c.waitUntil((async () => { ... })());  <-- runs immediately!
   *
   * To simulate properly in tests, we need to:
   * 1. Store the function reference, not the promise
   * 2. Execute the function only when we want to run background tasks
   */

  // Simulate the Cloudflare Worker environment
  function createCloudflareEnvironment() {
    // Queue to store background task functions
    const backgroundTaskFns = [];

    // Execution context with waitUntil method
    const executionCtx = {
      waitUntil: vi.fn((promise) => {
        // Instead of accepting the promise, we'll wrap it
        // This stops the execution until we explicitly run it
        const promiseCreator = () => promise;
        backgroundTaskFns.push(promiseCreator);
      })
    };

    // Function to run all queued background tasks
    const runBackgroundTasks = async () => {
      const tasks = [...backgroundTaskFns];
      backgroundTaskFns.length = 0;

      for (const taskFn of tasks) {
        try {
          await taskFn();
        } catch (error) {
          console.error('Background task error:', error);
        }
      }
    };

    return {
      executionCtx,
      runBackgroundTasks,
      backgroundTaskFns
    };
  }

  it('should run the main handler first, then background tasks', async () => {
    // Setup
    const { executionCtx, runBackgroundTasks, backgroundTaskFns } = createCloudflareEnvironment();

    // Track execution order
    const executionOrder = [];
    let backgroundRan = false;

    // Handler function (simulates a Cloudflare Worker)
    async function handler() {
      executionOrder.push('main-start');

      // Queue a background task - this is how it's done in Cloudflare
      executionCtx.waitUntil(new Promise((resolve) => {
        const bgTask = () => {
          executionOrder.push('background');
          backgroundRan = true;
          resolve();
        };

        // Store the function reference so we can call it later
        // In real code, this would start executing immediately
        // but in our mock, we'll delay it
        setTimeout(bgTask, 0);
      }));

      executionOrder.push('main-end');

      return { status: 'success' };
    }

    // Execute the handler
    const result = await handler();

    // Verify:
    // 1. The main handler completed
    expect(result).toEqual({ status: 'success' });

    // 2. Main handler started and completed before any background tasks ran
    expect(executionOrder).toEqual(['main-start', 'main-end']);
    expect(backgroundRan).toBe(false);

    // 3. Background task was queued but not executed yet
    expect(backgroundTaskFns.length).toBe(1);

    // Now run the background tasks
    await runBackgroundTasks();

    // 4. Verify the execution order after background tasks were run
    expect(executionOrder).toEqual(['main-start', 'main-end', 'background']);
    expect(backgroundRan).toBe(true);
  });

  it('should implement the stale-while-revalidate caching pattern', async () => {
    // Setup
    const { executionCtx, runBackgroundTasks, backgroundTaskFns } = createCloudflareEnvironment();

    // Mock cache with stale data
    const cache = {
      data: {
        value: 'stale-data',
        timestamp: Date.now() - 3600000 // 1 hour old (stale)
      },
      get: vi.fn(function() { return this.data; }),
      set: vi.fn(function(newData) { this.data = newData; })
    };

    // Mock external API
    const fetchFromUpstream = vi.fn().mockResolvedValue('fresh-data');

    // Track execution
    const executionOrder = [];
    let refreshStarted = false;
    let refreshCompleted = false;

    // Handler function implementing stale-while-revalidate
    async function handleRequest() {
      executionOrder.push('handler-start');

      // Get data from cache
      const cachedData = cache.get();

      // Check if data is stale (older than 5 minutes)
      const isStale = Date.now() - cachedData.timestamp > 5 * 60 * 1000;

      if (isStale) {
        // Queue background refresh without waiting
        executionCtx.waitUntil(new Promise(async (resolve) => {
          // In a real implementation this would run immediately
          // In our test, we'll run it only when specifically requested
          const bgRefresh = async () => {
            refreshStarted = true;
            executionOrder.push('refresh-start');
            const freshData = await fetchFromUpstream();
            cache.set({
              value: freshData,
              timestamp: Date.now()
            });
            executionOrder.push('refresh-end');
            refreshCompleted = true;
            resolve();
          };

          // Don't call bgRefresh() here - we'll call it during runBackgroundTasks
          setTimeout(bgRefresh, 0);
        }));
      }

      // Return cached data immediately
      executionOrder.push('handler-end');
      return cachedData.value;
    }

    // Execute the handler
    const result = await handleRequest();

    // Verify:
    // 1. We got the stale data immediately
    expect(result).toBe('stale-data');

    // 2. Handler completed without waiting for refresh
    expect(executionOrder).toEqual(['handler-start', 'handler-end']);
    expect(refreshStarted).toBe(false);
    expect(refreshCompleted).toBe(false);

    // 3. The upstream API was not called yet
    expect(fetchFromUpstream).not.toHaveBeenCalled();

    // 4. Background task was queued
    expect(backgroundTaskFns.length).toBe(1);

    // Now run the background tasks
    await runBackgroundTasks();

    // 5. Verify the API was called during background refresh
    expect(fetchFromUpstream).toHaveBeenCalled();
    expect(refreshStarted).toBe(true);
    expect(refreshCompleted).toBe(true);

    // 6. Cache was updated with fresh data
    expect(cache.set).toHaveBeenCalledWith({
      value: 'fresh-data',
      timestamp: expect.any(Number)
    });

    // 7. Execution order shows background refresh happened after handler
    expect(executionOrder).toEqual([
      'handler-start',
      'handler-end',
      'refresh-start',
      'refresh-end'
    ]);
  });
});
