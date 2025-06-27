# VSR Registry Tests

This directory contains tests for the VSR (vlt-specific registry)
upstream package routes that were fixed to handle unencoded scoped
packages and version-specific requests.

## Test Structure

### `route-patterns.test.ts`

**Pure logic tests** that validate the core route pattern analysis
without requiring the full Hono app or Cloudflare Workers environment.

**Covers:**

- Path segmentation for different route types
- Route type detection (packument vs manifest requests)
- URL encoding/decoding handling
- Route disambiguation logic (scoped packages vs version requests)
- Package name construction
- Edge cases and validation

**Example patterns tested:**

- `/npm/lodash` → Regular package packument
- `/npm/lodash/4.17.21` → Regular package manifest
- `/npm/@types/node` → Scoped package packument
- `/npm/@types/node/20.0.0` → Scoped package manifest
- `/npm/@types%2Fnode` → URL-encoded scoped package

### `upstream-routes-simple.test.ts`

**Unit tests with mocking** that test the upstream route logic with
mocked dependencies.

**Covers:**

- Route pattern matching logic
- URL encoding compatibility
- Parameter mocking for different route types
- Package name construction in `getPackageManifest`
- Upstream validation logic
- Response structure validation

**Uses mocks for:**

- Package route handlers (`getPackagePackument`, `getPackageManifest`,
  `getPackageTarball`)
- Upstream utilities (`isValidUpstreamName`, `getUpstreamConfig`)

### `upstream-routes-cloudflare.test.ts` (Future)

**Integration tests** designed to work with the Cloudflare Workers
environment using `@cloudflare/vitest-pool-workers`.

**Note:** Currently commented out due to version compatibility issues
between `vitest@1.6.1` and `@cloudflare/vitest-pool-workers` which
requires `vitest@2.0.x - 3.2.x`.

**Would cover:**

- Full end-to-end testing with real Cloudflare Workers environment
- Database interactions with proper context
- Real HTTP requests and responses
- Security headers validation
- Error handling with proper status codes

## Key Fixes Tested

The tests validate the fixes implemented for:

1. **Unencoded Scoped Packages**: Support for URLs like
   `/npm/@types/node` instead of requiring `/npm/@types%2Fnode`

2. **Route Disambiguation**: Correctly distinguishing between:
   - `/npm/@types/node` (scoped package packument)
   - `/npm/lodash/4.17.21` (regular package manifest)

3. **Parameter Mocking**: Proper parameter extraction and mocking for
   different route types:
   - Regular packages: `scope: undefined, pkg: "lodash"`
   - Scoped packages: `scope: "@types/node", pkg: undefined` (for
     manifests)

4. **Version Resolution**: Correct handling of version-specific
   requests for both regular and scoped packages

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test test/route-patterns.test.ts
pnpm test test/upstream-routes-simple.test.ts

# Run tests in watch mode
pnpm test --watch
```

## Test Results

All tests currently pass (30 tests total):

- ✅ 16 tests in `route-patterns.test.ts`
- ✅ 14 tests in `upstream-routes-simple.test.ts`

## Future Improvements

1. **Upgrade to Vitest 2.x** to enable Cloudflare Workers integration
   testing
2. **Add performance tests** for caching behavior
3. **Add tarball download tests** for complete end-to-end validation
4. **Add tests for edge cases** like very long package names, special
   characters, etc.

## Configuration

Tests are configured in `vitest.config.ts` with:

- 30-second timeout for upstream requests
- Node.js environment for current tests
- Global test setup in `test/setup.ts`
