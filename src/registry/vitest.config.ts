import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds timeout for upstream requests
    hookTimeout: 10000, // 10 seconds for setup/teardown
    setupFiles: ['./test/setup.ts'],
    // Separate configuration for different test types
    include: [
      'test/route-patterns.test.ts',
      'test/upstream-routes-simple.test.ts',
      'test/route-coverage.test.ts',
      'test/tarball-disttag-resolution.test.ts',
      // 'test/api-compliance.test.ts' // Disabled due to env requirements
    ],
  },
  esbuild: {
    target: 'es2022',
  },
})
