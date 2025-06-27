# Background Refresh Testing

This directory contains tests for the background refresh functionality and the stale-while-revalidate caching pattern used in this registry.

## Understanding the Cache Refresh Pattern

The registry implements a "stale-while-revalidate" caching pattern for faster responses:

1. When a request is received, we first check if the data is in our cache
2. If the data is in the cache, we return it immediately, even if it's stale (old)
3. If the data is stale, we queue a background task to refresh it from the upstream registry
4. The background task updates the cache with fresh data for future requests
5. This approach ensures users get a fast response (cached data) while keeping our cache up-to-date

## How `waitUntil` Works

Cloudflare Workers provide a special API called `waitUntil` that enables background tasks to continue running after a response has been sent. Here's a simplified example:

```javascript
export default {
  async fetch(request, env, ctx) {
    // Return a response immediately
    const response = new Response("Hello World");

    // Queue a background task that continues after response is sent
    ctx.waitUntil(
      (async () => {
        // This runs in the background after response is sent
        await doLongRunningTask();
      })()
    );

    return response;
  }
};
```

## Test Files

- `waituntil-demo.test.js`: Demonstrates the `waitUntil` API and caching pattern
- `waituntil-correct.test.js`: Shows the correct way to test the `waitUntil` pattern
- `hono-context.test.js`: Demonstrates how to mock the Hono context with proper `waitUntil` support
- `route-with-waituntil.test.js`: Tests a route handler implementing the stale-while-revalidate pattern

## Testing the `waitUntil` Pattern

Testing `waitUntil` behavior can be tricky because of how JavaScript executes Immediately Invoked Function Expressions (IIFEs). The common mistake is to use code like this:

```javascript
// ❌ PROBLEM: This executes the function immediately!
c.waitUntil((async () => {
  // Background work
  await refreshCache();
})());
```

Instead, our testing approach:

1. Correctly simulates the Cloudflare `waitUntil` API
2. Captures background tasks without executing them immediately
3. Allows precise control over when background tasks run

See `waituntil-README.md` for detailed documentation on our testing approach.

## Implementation Details

In the codebase, this pattern is used in:
- `getPackagePackument`: to fetch package metadata
- `getPackageManifest`: to fetch specific package versions

## Testing Challenges

Testing asynchronous background tasks presents challenges:
1. Ensuring the correct execution order (main handler first, then background tasks)
2. Verifying the background task actually runs
3. Controlling when background tasks execute in tests

Our test suite includes examples showing how to correctly test each of these aspects.

## Running Tests

```bash
# Run all tests
npm test

# Run only the cache refresh tests
npm run test:cache

# Run only the improved waitUntil tests
npm run test:improved
```
