import { describe, it, expect, vi } from 'vitest';

/**
 * This test demonstrates how to properly mock the Hono context
 * for testing routes, including waitUntil functionality
 */
describe('Mocking Hono Context', () => {
  /**
   * Create a mock Hono context for testing routes
   */
  function createMockContext(options = {}) {
    // Store response values
    let responseBody = null;
    let responseStatus = 200;
    let responseHeaders = {};

    // Store background task functions
    const backgroundTaskFns = [];

    // Default options
    const defaults = {
      params: {},
      query: {},
      headers: {},
      dbData: null
    };

    const opts = { ...defaults, ...options };

    // Mock context
    const context = {
      // Request
      req: {
        param: (name) => opts.params[name],
        query: (name) => opts.query[name],
        header: (name) => opts.headers[name]
      },

      // Route parameters
      params: opts.params,

      // Database methods
      db: {
        get: vi.fn().mockImplementation(async (key) => {
          return opts.dbData && opts.dbData[key] ? opts.dbData[key] : null;
        }),
        set: vi.fn()
      },

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
        responseBody = data;
        return context;
      }),

      // Execution context for background tasks
      executionCtx: {
        waitUntil: vi.fn((promise) => {
          // Instead of accepting the promise directly, we'll store a function
          // This prevents immediate execution of IIFEs
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
        body: responseBody,
        status: responseStatus,
        headers: responseHeaders
      }),

      // Expose for testing
      backgroundTaskFns
    };

    return context;
  }

  it('should mock Hono context successfully', async () => {
    // Create mock context with route parameters
    const context = createMockContext({
      params: { id: '123', name: 'test' }
    });

    // Create a simple handler
    async function handler(c) {
      const id = c.params.id;
      const name = c.params.name;
      return c.json({ id, name });
    }

    // Execute the handler
    await handler(context);

    // Get the response
    const { body, status } = context.getResponse();

    // Verify the response
    expect(status).toBe(200);
    expect(body).toEqual({ id: '123', name: 'test' });
  });

  it('should handle database interactions', async () => {
    // Setup mock DB data
    const mockData = {
      'package:express': { name: 'express', version: '4.18.2' }
    };

    // Create mock context with DB data
    const context = createMockContext({
      params: { name: 'express' },
      dbData: mockData
    });

    // Create a handler that uses the DB
    async function getPackage(c) {
      const name = c.params.name;
      const packageData = await c.db.get(`package:${name}`);

      if (!packageData) {
        return c.status(404).json({ error: 'Package not found' });
      }

      return c.json(packageData);
    }

    // Execute the handler
    await getPackage(context);

    // Get the response
    const { body, status } = context.getResponse();

    // Verify
    expect(context.db.get).toHaveBeenCalledWith('package:express');
    expect(status).toBe(200);
    expect(body).toEqual({ name: 'express', version: '4.18.2' });
  });

  it('should handle background tasks with waitUntil', async () => {
    // Setup state for tracking
    const executionOrder = [];
    let refreshTaskCompleted = false;

    // Create mock context
    const context = createMockContext({
      params: { name: 'react' },
      dbData: {
        'package:react': {
          name: 'react',
          version: '18.2.0',
          stale: true
        }
      }
    });

    // Create a handler that uses waitUntil
    async function getPackageWithRefresh(c) {
      executionOrder.push('handler-start');

      const name = c.params.name;
      const packageData = await c.db.get(`package:${name}`);

      if (!packageData) {
        executionOrder.push('handler-end-404');
        return c.status(404).json({ error: 'Package not found' });
      }

      // If data is stale, refresh in background
      if (packageData.stale) {
        c.executionCtx.waitUntil(new Promise(async (resolve) => {
          // This function shouldn't execute yet
          const bgTask = async () => {
            executionOrder.push('refresh-start');

            // Simulate getting fresh data
            const freshData = { ...packageData, version: '18.3.0', stale: false };

            // Update the DB
            await c.db.set(`package:${name}`, freshData);

            executionOrder.push('refresh-end');
            refreshTaskCompleted = true;
            resolve();
          };

          // Don't execute immediately - we'll run this later
          setTimeout(bgTask, 0);
        }));
      }

      executionOrder.push('handler-end-success');
      return c.json(packageData);
    }

    // Execute the handler
    await getPackageWithRefresh(context);

    // Get the response
    const { body } = context.getResponse();

    // Verify initial response
    expect(body).toEqual({ name: 'react', version: '18.2.0', stale: true });
    expect(executionOrder).toEqual([
      'handler-start',
      'handler-end-success'
    ]);
    expect(refreshTaskCompleted).toBe(false);
    expect(context.backgroundTaskFns.length).toBe(1);

    // Now run background tasks
    await context.runBackgroundTasks();

    // Verify background task effects
    expect(context.db.set).toHaveBeenCalledWith(
      'package:react',
      { name: 'react', version: '18.3.0', stale: false }
    );
    expect(executionOrder).toEqual([
      'handler-start',
      'handler-end-success',
      'refresh-start',
      'refresh-end'
    ]);
    expect(refreshTaskCompleted).toBe(true);
  });
});
