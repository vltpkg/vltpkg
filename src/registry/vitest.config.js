import { defineConfig } from 'vitest/config';

/**
 * Consolidated Vitest configuration
 *
 * This config uses the VITEST_MODE environment variable to determine which tests to run:
 * - No mode: Run all tests except excluded ones (default behavior)
 * - cache: Run waituntil and cloudflare waituntil tests
 * - improved: Run improved waituntil related tests
 * - slim: Run manifest slimming tests
 * - integrity: Run integrity validation tests
 * - json-format: Run JSON response tests
 * - packument: Run packument consistency tests
 */

// Get the test mode from environment variable
const testMode = process.env.VITEST_MODE;

// Base configuration shared across all modes
const baseConfig = {
  globals: true,
  environment: 'node',
  testTimeout: testMode ? 10000 : 30000, // Default 30s for full test suite, 10s for specific tests
  watchExclude: ['node_modules', 'dist', '.git'],
};

// Define test configurations for each mode
const testConfigs = {
  // Default config for running all tests
  default: {
    ...baseConfig,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/test/cache-refresh.test.js',
      '**/test/background-refresh.test.js',
      '**/test/caching-simple.test.js',
      '**/test/waituntil-task-queue.test.js',
      '**/test/background-concepts.test.js',
      '**/test/waituntil.test.js'
    ],
    include: ['test/**/*.test.js'],
    hookTimeout: 30000,
    teardownTimeout: 10000,
    reporters: ['verbose'],
  },
  // Config for cache tests
  cache: {
    ...baseConfig,
    include: [
      'test/waituntil-demo.test.js',
      'test/cloudflare-waituntil.test.js'
    ],
  },
  // Config for improved tests
  improved: {
    ...baseConfig,
    include: [
      'test/waituntil-correct.test.js',
      'test/hono-context.test.js',
      'test/route-with-waituntil.test.js'
    ],
  },
  // Config for slim tests
  slim: {
    ...baseConfig,
    include: ['test/manifest-slimming.test.js'],
    testTimeout: 5000,
  },
  // Config for integrity tests
  integrity: {
    ...baseConfig,
    include: ['test/integrity-validation.test.js'],
  },
  // Config for JSON format tests
  'json-format': {
    ...baseConfig,
    include: ['test/json-response.test.js'],
  },
  // Config for packument tests
  packument: {
    ...baseConfig,
    include: [
      'test/packument-consistency.test.js',
      'test/packument-version-range.test.js'
    ],
  },
};

// Select the appropriate config based on the mode
const selectedConfig = testConfigs[testMode] || testConfigs.default;

export default defineConfig({
  test: selectedConfig,
});
