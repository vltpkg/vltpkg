# Contributing to VSR (vlt serverless registry)

Thank you for your interest in contributing to VSR! This document provides guidelines and instructions for development, testing, and contributing to the project.

## Table of Contents

- [Contributing to VSR (vlt serverless registry)](#contributing-to-vsr-vlt-serverless-registry)
  - [Table of Contents](#table-of-contents)
  - [Development Setup](#development-setup)
  - [Project Structure](#project-structure)
  - [Testing](#testing)
    - [Running Tests](#running-tests)
    - [Testing Background Refresh Functionality](#testing-background-refresh-functionality)
      - [How `waitUntil` Works](#how-waituntil-works)
    - [Testing Patterns](#testing-patterns)
      - [Test Files](#test-files)
  - [Deployment](#deployment)
    - [Local Deployment](#local-deployment)
    - [Production Deployment](#production-deployment)
  - [Caching Implementation](#caching-implementation)
    - [Implementation Details](#implementation-details)
  - [Contribution Guidelines](#contribution-guidelines)
  - [Pull Request Process](#pull-request-process)
  - [Code Style](#code-style)

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vltpkg/vsr.git
   cd vsr
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Run the development server**:
   ```bash
   pnpm run serve:dev
   ```
   This will start a local development server at http://localhost:1337 with the Cloudflare Workers environment simulated locally.

4. **Database setup**:
   ```bash
   pnpm run db:setup
   ```
   This initializes the local D1 database for development.

## Project Structure

- `src/` - Core application source code
  - `db/` - Database models and migrations
  - `routes/` - API route handlers
  - `middleware/` - Middleware functions
  - `utils/` - Utility functions
- `test/` - Test files and utilities
- `scripts/` - Helper scripts
- `bin/` - CLI entry point

## Testing

VSR has a comprehensive test suite that covers various aspects of the codebase, including the stale-while-revalidate caching pattern implemented with Cloudflare Workers' `waitUntil` API.

### Running Tests

```bash
# Run all tests
pnpm run test
```

### Testing Background Refresh Functionality

The registry implements a "stale-while-revalidate" caching pattern for faster responses:

1. When a request is received, we first check if the data is in our cache
2. If the data is in the cache, we return it immediately, even if it's stale (old)
3. If the data is stale, we queue a background task to refresh it from the upstream registry
4. The background task updates the cache with fresh data for future requests
5. This approach ensures users get a fast response (cached data) while keeping our cache up-to-date

This pattern is implemented in the following key files:
- `getPackagePackument`: For fetching package metadata
- `getPackageManifest`: For fetching specific package versions

#### How `waitUntil` Works

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

### Testing Patterns

Testing `waitUntil` behavior can be tricky because of how JavaScript executes Immediately Invoked Function Expressions (IIFEs). The common mistake is to use code like this:

```javascript
// ❌ PROBLEM: This executes the function immediately!
c.waitUntil((async () => {
  // Background work
  await refreshCache();
})());
```

Our testing approach:

1. Correctly simulates the Cloudflare `waitUntil` API
2. Captures background tasks without executing them immediately
3. Allows precise control over when background tasks run

For detailed documentation on testing this pattern, refer to `test/waituntil-README.md`.

#### Test Files

- `waituntil-correct.test.js`: Demonstrates the core pattern with simple examples
- `hono-context.test.js`: Shows how to mock the Hono context with proper `waitUntil` support
- `route-with-waituntil.test.js`: Tests a route handler implementing the stale-while-revalidate pattern

## Deployment

### Local Deployment

For local usage, you can simply run:

```bash
vlx vltpkg/vsr
```

This will start the registry locally at http://localhost:1337.

### Production Deployment

VSR is designed to be deployed on Cloudflare Workers. To deploy to production:

1. **Set up Cloudflare account and create necessary resources**:
   - Create a Cloudflare account if you don't have one
   - Create a new D1 Database
   - Create a new R2 Bucket

2. **Configure your `wrangler.toml`**:
   Make sure your configuration includes the correct bindings for D1 and R2.

3. **Deploy using Wrangler**:
   ```bash
   pnpm run build   # Create deployment bundle
   pnpm run deploy  # Deploy to Cloudflare Workers
   ```

4. **Post-deployment setup**:
   - Initialize your database with the schema
   - Create admin tokens as needed

## Caching Implementation

The stale-while-revalidate caching pattern is a core feature of VSR. It provides several benefits:

1. **Improved Response Times**: By returning cached data immediately, users experience fast response times.
2. **Reduced Load on Upstream Registry**: By caching package data, we reduce the number of requests to the upstream npm registry.
3. **Background Updates**: By refreshing stale data in the background, cache stays current without impacting user response time.

### Implementation Details

The caching logic is implemented as follows:

1. **Cache Check**: When a request comes in, we check if the data exists in our cache (D1 database).
2. **Freshness Check**: If the data exists, we check if it's fresh (typically less than 5 minutes old).
3. **Response Strategy**:
   - If data is fresh: Return it immediately
   - If data is stale: Return it immediately AND queue a background refresh
   - If data doesn't exist: Fetch from upstream, cache it, then return

4. **Background Refresh**:
   ```javascript
   // Example pattern (simplified)
   if (isStale) {
     c.executionCtx.waitUntil(new Promise(async (resolve) => {
       const bgRefresh = async () => {
         const freshData = await fetchFromUpstream();
         await saveToCache(freshData);
         resolve();
       };

       setTimeout(bgRefresh, 0);
     }));
   }
   ```

## Contribution Guidelines

1. **Create an issue** first to discuss proposed changes or report bugs
2. **Fork the repository** and create a feature branch for your changes
3. **Write tests** for new features or bug fixes
4. **Ensure code quality** by following the established style and patterns
5. **Submit a pull request** referencing the original issue

## Pull Request Process

1. Ensure your code passes all tests and linting
2. Update documentation if necessary
3. Add yourself to the contributors list (if not already there)
4. Submit your PR with a clear description of changes
5. Address any feedback from code reviews

## Code Style

- Use modern JavaScript features
- Follow the existing code structure and naming conventions
- Document new functions and components with JSDoc comments
- Maintain comprehensive test coverage

Thank you for contributing to VSR!
