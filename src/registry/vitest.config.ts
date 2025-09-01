import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    globals: true,
    testTimeout: 30000, // 30 seconds timeout for upstream requests
    hookTimeout: 10000, // 10 seconds for setup/teardown
    setupFiles: ['./test/setup.ts'],
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.json',
        },
      },
    },
  },
  esbuild: {
    target: 'es2022',
  },
})
